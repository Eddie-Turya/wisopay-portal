import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { MARKETS, CURRENCY_NAMES, type ProviderId } from "./coverage";
import { api, ApiError, getSession } from "./api";
import { inUSD, type Payment, type PayStatus, type Payout, type PayoutStatus, type Settlement } from "./data";

/* ---------- API shapes ---------- */

export type ApiTx = {
  id: string;
  object: "deposit" | "payout" | "refund";
  environment: "sandbox" | "live";
  status: string;
  amount: string;
  fee: string;
  refundedAmount?: string;
  currency: string;
  network?: string;
  country?: string;
  phoneNumber: string;
  merchantReference: string | null;
  metadata?: Record<string, string>;
  failure: { code: string; message: string | null } | null;
  createdAt: string;
  completedAt: string | null;
};
export type Me = {
  announcement?: string | null;
  user: { id: string; email: string; name: string; role: string; mfaEnabled: boolean };
  merchant: { id: string; legalName: string; tradingName: string | null; country: string; industry: string | null; website: string | null; plan: "DEVELOPER" | "BUSINESS" | "CUSTOM"; status: "PENDING_VERIFICATION" | "ACTION_REQUIRED" | "ACTIVE" | "SUSPENDED" | "REJECTED"; liveEnabled: boolean; createdAt: string };
};
export type ApiNetwork = { code: string; name: string; country: string; currency: string; decimals: number; status: string };
export type Kyc = { status: string; reason?: string | null; submittedAt?: string; decidedAt?: string | null; documents?: { type: string; filename: string; size: number }[]; merchantStatus: string };
export type BalanceRow = { key: string; code: string; country: string; flag: string; currency: string; name: string; providers: ProviderId[]; available: number; pending: number; availableExact: string };
export type Note = { id: string; title: string; body: string; time: string; unread: boolean; link?: string | null };

/* ---------- Mapping to the portal's view shapes ---------- */

const payStatus = (s: string): PayStatus => (s === "SUCCESS" ? "succeeded" : ["REFUNDED", "PARTIALLY_REFUNDED", "REVERSED"].includes(s) ? "refunded" : ["FAILED", "EXPIRED", "CANCELLED"].includes(s) ? "failed" : "pending");
const payoutStatus = (s: string): PayoutStatus => (s === "SUCCESS" ? "paid" : ["FAILED", "EXPIRED", "CANCELLED", "REVERSED"].includes(s) ? "failed" : "processing");
const settlementStatus = (s: string): Settlement["status"] => (s === "SENT" ? "paid" : s === "APPROVED" ? "in_transit" : s === "PENDING_APPROVAL" ? "scheduled" : s === "REJECTED" ? "rejected" : s === "CANCELLED" ? "cancelled" : "failed");

/** Same naming as the coverage data: plain names in Tanzania, "Name · CC" elsewhere, "· CD USD" for USD rails. */
export function networkLabel(n: ApiNetwork | undefined, code?: string) {
  if (!n) return code || "—";
  const usd = /\(USD\)$/.test(n.name);
  const base = n.name.replace(/\s*\(USD\)$/, "");
  return n.country === "TZ" ? base : `${base} · ${n.country}${usd ? " USD" : ""}`;
}

export function toPayment(t: ApiTx, nets: Map<string, ApiNetwork>): Payment & { raw: ApiTx } {
  return {
    id: t.id,
    ref: t.merchantReference ?? "—",
    customer: t.metadata?.customerName ?? (t.phoneNumber ? `+${t.phoneNumber}` : t.merchantReference ?? "—"),
    phone: t.phoneNumber ? `+${t.phoneNumber}` : "—",
    email: t.metadata?.customerEmail ?? "",
    network: networkLabel(nets.get(t.network ?? ""), t.network),
    country: t.country ?? "",
    method: "mobile_money",
    currency: t.currency,
    amount: Number(t.amount),
    fee: Number(t.fee),
    status: payStatus(t.status),
    createdAt: Date.parse(t.createdAt),
    raw: t,
  };
}
export function toPayout(t: ApiTx, nets: Map<string, ApiNetwork>): Payout & { raw: ApiTx } {
  return {
    id: t.id,
    recipient: t.metadata?.recipient ?? (t.phoneNumber ? `+${t.phoneNumber}` : "—"),
    account: t.phoneNumber ? `+${t.phoneNumber}` : "—",
    network: networkLabel(nets.get(t.network ?? ""), t.network),
    currency: t.currency,
    amount: Number(t.amount),
    fee: Number(t.fee),
    status: payoutStatus(t.status),
    note: t.metadata?.note ?? t.merchantReference ?? "",
    createdAt: Date.parse(t.createdAt),
    raw: t,
  };
}

function balanceRows(api: { currency: string; available: string; reserved: string }[], home: string): BalanceRow[] {
  const currencies = [...new Set(MARKETS.map((m) => m.currency))];
  return currencies.map((cur) => {
    const markets = MARKETS.filter((m) => m.currency === cur);
    const m = markets.find((x) => x.code === home) ?? markets[0];
    const b = api.find((x) => x.currency === cur);
    const region = markets.length > 1 && !markets.every((x) => x.code === m.code) ? (cur === "XOF" ? "West Africa (CFA)" : cur === "XAF" ? "Central Africa (CFA)" : m.name) : m.name;
    return {
      key: cur,
      code: m.code,
      country: region,
      flag: m.flag,
      currency: cur,
      name: CURRENCY_NAMES[cur] ?? cur,
      providers: [...new Set(markets.flatMap((x) => x.providers))],
      available: Number(b?.available ?? 0),
      pending: Number(b?.reserved ?? 0),
      availableExact: b?.available ?? "0",
    };
  });
}

const ago = (iso: string) => {
  const s = (Date.now() - Date.parse(iso)) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hours ago`;
  return `${Math.floor(s / 86400)} days ago`;
};

/* ---------- Provider ---------- */

type Live = {
  ready: boolean;
  error: string | null;
  env: "sandbox" | "live";
  me: Me | null;
  kyc: Kyc | null;
  networks: ApiNetwork[];
  netByCode: Map<string, ApiNetwork>;
  payments: (Payment & { raw: ApiTx })[];
  payouts: (Payout & { raw: ApiTx })[];
  balances: BalanceRow[];
  settlements: Settlement[];
  notifications: Note[];
  /** Time of the last data load; use instead of Date.now() during render. */
  now: number;
  reload: () => Promise<void>;
};

const Ctx = createContext<Live | null>(null);
export const useLive = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useLive outside LiveProvider");
  return v;
};

async function allTx(type: "DEPOSIT" | "PAYOUT", env: "sandbox" | "live") {
  // The dashboard keeps the latest 300 of each type in memory; older ones via search/export.
  const out: ApiTx[] = [];
  for (let page = 1; page <= 3; page++) {
    const r = await api<{ data: ApiTx[]; total: number }>(`/dashboard/transactions?type=${type}&limit=100&page=${page}`, { env });
    out.push(...r.data);
    if (out.length >= r.total || r.data.length < 100) break;
  }
  return out;
}

/** `wantLive`: the user's test-mode switch is off. Live data is shown only for verified, live-enabled merchants. */
export function LiveProvider({ wantLive, children }: { wantLive: boolean; children: ReactNode }) {
  const [env, setEnv] = useState<"sandbox" | "live">("sandbox");
  const [state, setState] = useState<Omit<Live, "reload" | "env" | "netByCode">>({ now: 0, ready: false, error: null, me: null, kyc: null, networks: [], payments: [], payouts: [], balances: [], settlements: [], notifications: [] });
  const [raw, setRaw] = useState<{ deposits: ApiTx[]; payouts: ApiTx[]; balances: { currency: string; available: string; reserved: string }[]; settlements: { id: string; currency: string; amount: string; destination: string; status: string; createdAt: string; reference?: string | null; note?: string | null; adminNote?: string | null; fee?: number; payout?: number }[] }>({ deposits: [], payouts: [], balances: [], settlements: [] });

  const load = useCallback(async () => {
    try {
      const me = await api<Me>("/dashboard/me");
      const env: "sandbox" | "live" = wantLive && me.merchant.status === "ACTIVE" && me.merchant.liveEnabled ? "live" : "sandbox";
      setEnv(env);
      const canMoney = ["OWNER", "ADMIN", "FINANCE"].includes(me.user.role);
      const [networks, deposits, payouts, balances, settlements, notes, kyc] = await Promise.all([
        api<{ data: ApiNetwork[] }>("/dashboard/networks", { env }),
        allTx("DEPOSIT", env),
        allTx("PAYOUT", env),
        api<{ data: { currency: string; available: string; reserved: string }[] }>("/dashboard/balances", { env }),
        canMoney ? api<{ data: { id: string; currency: string; amount: string; destination: string; status: string; createdAt: string; reference?: string | null; note?: string | null; adminNote?: string | null; fee?: number; payout?: number }[] }>("/dashboard/settlements", { env }) : Promise.resolve({ data: [] }),
        api<{ data: { id: string; title: string; body: string; read: boolean; createdAt: string; link?: string | null }[] }>("/dashboard/notifications", { env }),
        api<Kyc>("/dashboard/kyc", { env }),
      ]);
      setRaw({ deposits, payouts, balances: balances.data, settlements: settlements.data });
      setState((s) => ({
        ...s,
        now: Date.now(),
        ready: true,
        error: null,
        me,
        kyc,
        networks: networks.data,
        notifications: notes.data.map((n) => ({ id: n.id, title: n.title, body: n.body, time: ago(n.createdAt), unread: !n.read, link: n.link ?? null })),
      }));
    } catch (e) {
      console.error("Portal data load failed", e);
      setState((s) => ({ ...s, ready: true, error: e instanceof ApiError ? e.message : `Couldn’t load your data (${e instanceof Error ? e.message : String(e)})` }));
    }
  }, [wantLive]);

  useEffect(() => {
    // Initial load and whenever the sandbox/live switch changes; light polling keeps statuses fresh.
    void load();
    const t = setInterval(() => void load(), 30_000);
    return () => clearInterval(t);
  }, [load]);

  const value = useMemo<Live>(() => {
    const netByCode = new Map(state.networks.map((n) => [n.code, n]));
    return {
      ...state,
      env,
      netByCode,
      payments: raw.deposits.map((t) => toPayment(t, netByCode)),
      payouts: raw.payouts.map((t) => toPayout(t, netByCode)),
      balances: balanceRows(raw.balances, state.me?.merchant.country ?? "TZ"),
      settlements: raw.settlements.map((s) => ({ id: s.id, date: Date.parse(s.createdAt), amount: Number(s.amount), currency: s.currency, count: 0, bank: s.destination, status: settlementStatus(s.status), reference: s.reference ?? null, note: s.note ?? null, adminNote: s.adminNote ?? null, fee: s.fee ?? 0, payout: s.payout ?? Number(s.amount) })),
      reload: load,
    };
  }, [state, raw, env, load]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/* ---------- Derived helpers (replace the demo-data ones) ---------- */

const DAY = 86_400_000;

/** Daily USD totals for successful collections and/or payouts, ending today. */
export function dailySeries(payments: Payment[], payouts: Payout[], days: number, kind: "collections" | "payouts" | "all" = "collections", end = Date.now()) {
  const buckets = Array.from({ length: days }, (_, i) => ({ t: end - (days - 1 - i) * DAY, v: 0, n: 0 }));
  const start = end - days * DAY;
  const add = (t: number, v: number) => {
    if (t < start) return;
    const i = Math.min(days - 1, Math.floor((t - start) / DAY));
    buckets[i].v += v;
    buckets[i].n++;
  };
  if (kind !== "payouts") for (const p of payments) if (p.status === "succeeded") add(p.createdAt, inUSD(p.amount, p.currency));
  if (kind !== "collections") for (const p of payouts) if (p.status === "paid") add(p.createdAt, inUSD(p.amount, p.currency));
  return buckets;
}
export const totalUSD = (rows: BalanceRow[], k: "available" | "pending") => rows.reduce((s, b) => s + inUSD(b[k], b.currency), 0);

/** Generic loader for views that need extra endpoints (keys, webhooks, team…). */
export function useApi<T>(path: string | null, env?: "sandbox" | "live") {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!path) return;
    let alive = true;
    api<T>(path, { env })
      .then((d) => alive && (setData(d), setError(null)))
      .catch((e: Error) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [path, env, tick]);
  return { data, error, loading: !!path && data === null && !error, reload: () => setTick((t) => t + 1) };
}

/* ---------- WisoPay: volume by network ---------- */

const NET_NAME: Record<string, string> = { mpesa: "M-Pesa", airtel: "Airtel Money", mixx: "Mixx by Yas", halopesa: "HaloPesa", tpesa: "T-Pesa", other: "Other numbers", unknown: "No phone on record" };

/** WisoPay's payment list has no phone numbers, so the network split comes from the analytics endpoint. */
export function useNetworkVolume(days: number) {
  const { env } = useLive();
  const [rows, setRows] = useState<{ label: string; value: number; count: number }[] | null>(null);
  useEffect(() => {
    let alive = true;
    setRows(null);
    fetch(`/admin/portal/analytics?days=${days}&network_days=${days}&envType=${env}`, { headers: { Authorization: `Bearer ${getSession()?.accessToken ?? ""}` } })
      .then((r) => (r.ok ? r.json() : { byNetwork: [] }))
      .then((d) => alive && setRows((d.byNetwork ?? []).map((n: { network: string; volume: number; completed: number }) => ({ label: NET_NAME[n.network] ?? n.network, value: Number(n.volume) || 0, count: Number(n.completed) || 0 })).filter((x: { value: number }) => x.value > 0)))
      .catch(() => alive && setRows([]));
    return () => {
      alive = false;
    };
  }, [days, env]);
  return rows;
}
