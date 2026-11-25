import { MARKETS, PROVIDERS, type ProviderId } from "./coverage";

// Shared portal types, network list (from the coverage data) and formatting helpers. Live data comes from ./live.

export type PayStatus = "succeeded" | "pending" | "failed" | "refunded";
export type Method = "mobile_money" | "card" | "bank";

export type Payment = {
  id: string;
  ref: string;
  customer: string;
  phone: string;
  email: string;
  network: string;
  country: string;
  method: Method;
  currency: string;
  amount: number;
  fee: number;
  status: PayStatus;
  createdAt: number;
};

export type PayoutStatus = "paid" | "processing" | "failed";
export type Settlement = { id: string; date: number; amount: number; currency: string; count: number; bank: string; status: "paid" | "in_transit" | "scheduled" | "failed" | "rejected" | "cancelled"; reference?: string | null; note?: string | null; adminNote?: string | null; fee?: number; payout?: number };
export type Payout = {
  id: string;
  recipient: string;
  account: string;
  network: string;
  currency: string;
  amount: number;
  fee: number;
  status: PayoutStatus;
  note: string;
  createdAt: number;
};

type Net = { name: string; country: string; currency: string; provider: ProviderId; method: Method };

// Mobile money networks per market. Tanzania names are plain; other markets carry their country code.
export const NETWORKS: Net[] = MARKETS.flatMap((m) =>
  m.providers.map((pid) => ({
    name: m.code === "TZ" ? PROVIDERS[pid].name : `${PROVIDERS[pid].name} · ${m.code}${m.currency === "USD" ? " USD" : ""}`,
    country: m.code,
    currency: m.currency,
    provider: pid,
    method: "mobile_money" as Method,
  })),
);
export const NETWORK_COLOR: Record<string, string> = { ...Object.fromEntries(NETWORKS.map((n) => [n.name, PROVIDERS[n.provider].color])), Card: "#334155" };

/* ---------------- Helpers ---------------- */

const nf = new Intl.NumberFormat("en-US");
const nf2 = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function money(amount: number, currency = "TZS") {
  return `${currency} ${["USD", "ZMW", "SLE"].includes(currency) ? nf2.format(amount) : nf.format(Math.round(amount))}`;
}
export function compact(n: number) {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e4) return (n / 1e3).toFixed(0) + "k";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "k";
  return String(Math.round(n));
}
export const num = (n: number) => nf.format(n);

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function date(ms: number, withTime = true) {
  const d = new Date(ms);
  const s = `${MON[d.getUTCMonth()]} ${d.getUTCDate()}`;
  if (!withTime) return `${s}, ${d.getUTCFullYear()}`;
  return `${s}, ${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}
export const shortDate = (ms: number) => {
  const d = new Date(ms);
  return `${MON[d.getUTCMonth()]} ${d.getUTCDate()}`;
};

// Rough FX rates (to TZS). WisoPay works in TZS, so summaries are shown in TZS.
export const toTZS: Record<string, number> = { TZS: 1, KES: 20.1, UGX: 0.7, USD: 2590, XOF: 4.35, XAF: 4.35, CDF: 0.92, RWF: 1.85, SLE: 114, ZMW: 98 };

/** Convert an amount to TZS (the name is kept from ZawaPay, where summaries were in USD). */
export const inUSD = (amount: number, currency = "TZS") => amount * (toTZS[currency] ?? 1);
/** Format a summary figure in TZS, e.g. TZS 12,480 */
export const usd = (n: number) => "TZS " + nf.format(Math.round(n));

export function toCSV(rows: Record<string, unknown>[]) {
  if (!rows.length) return "";
  const keys = Object.keys(rows[0]);
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [keys.join(","), ...rows.map((r) => keys.map((k) => esc(r[k])).join(","))].join("\n");
}

export function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
