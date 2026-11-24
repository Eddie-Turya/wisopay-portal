import { tr } from "../i18n";

import Link from "../next";
import { useMemo, useState } from "react";
import { ArrowDown, ArrowLeftRight, ArrowUp, ArrowUpDown, CalendarClock, Download, Landmark, Pencil } from "lucide-react";
import { compact, date, download, money, toCSV, toTZS, inUSD, usd } from "../data";
import { dailySeries, useApi, useLive, useNetworkVolume } from "../live";
import { AreaChart, BarList, Bars } from "../charts";
import { ProviderMark } from "../ProviderMark";
import { Button, Card, CurrencyCard, Drawer, Field, Input, Modal, NetworkDot, PageHeader, Segmented, Select, Stat, Status, cx, td, th, trHover } from "../ui";

/* ================= Balances ================= */

type SortKey = "country" | "balance";
const dec2 = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function Balances() {
  const { balances: bal, payments, payouts } = useLive();
  const [sort, setSort] = useState<{ k: SortKey; asc: boolean }>({ k: "country", asc: true });
  const [cur, setCur] = useState("all");
  const [sel, setSel] = useState<string | null>(null);
  const [convert, setConvert] = useState(false);
  const [from, setFrom] = useState("KES");
  const [to, setTo] = useState("TZS");
  const [amount, setAmount] = useState("");
  const amt = Number(amount) || 0;
  const fromBal = bal.find((b) => b.key === from) ?? bal[0];
  const toBal = bal.find((b) => b.key === to) ?? bal[0];
  const rate = toTZS[fromBal.currency] / toTZS[toBal.currency];
  const out = amt * rate * 0.995; // 0.5% FX margin
  const selected = bal.find((b) => b.key === sel) ?? null;

  const rows = useMemo(() => {
    const r = bal.filter((b) => cur === "all" || b.currency === cur);
    return [...r].sort((x, y) => {
      const d = sort.k === "country" ? x.country.localeCompare(y.country) || x.currency.localeCompare(y.currency) : inUSD(x.available, x.currency) - inUSD(y.available, y.currency);
      return sort.asc ? d : -d;
    });
  }, [bal, cur, sort]);

  const ledger = useMemo(() => {
    const ins = payments.filter((p) => p.status === "succeeded").slice(0, 12).map((p) => ({ id: p.id, t: p.createdAt, desc: `Payment from ${p.customer}`, amount: p.amount - p.fee, currency: p.currency }));
    const outs = payouts.slice(0, 8).map((p) => ({ id: p.id, t: p.createdAt, desc: `Payout to ${p.recipient}`, amount: -(p.amount + p.fee), currency: p.currency }));
    return [...ins, ...outs].sort((a, b) => b.t - a.t).slice(0, 16);
  }, [payments, payouts]);

  const sortBtn = (k: SortKey, children: React.ReactNode) => (
    <button onClick={() => setSort((s) => ({ k, asc: s.k === k ? !s.asc : true }))} className="inline-flex items-center gap-1 hover:text-p-fg">
      {children}
      {sort.k === k ? sort.asc ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" /> : <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />}
    </button>
  );

  return (
    <>
      <PageHeader
        title={tr("Balances")}
        sub={tr("One wallet per country and currency. Money stays in the currency it was paid in until you convert or pay it out.")}
        actions={
          <Button variant="primary" disabled title={tr("WisoPay holds TZS only for now")}>
            <ArrowLeftRight className="h-4 w-4" /> {tr("Convert")}
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <CurrencyCard
          title={tr("Balances")}
          sub={tr("Each currency on its own. Money is never converted here.")}
          empty={tr("No wallets yet")}
          rows={balanceByCurrency(bal).map((b) => ({ currency: b.currency, value: money(b.available, b.currency), detail: `${b.markets} ${b.markets === 1 ? "market" : "markets"}` }))}
        />
        <div className="grid grid-cols-2 gap-4">
          <Stat label={tr("Active wallets")} value={`${bal.filter((b) => b.available > 0).length} of ${bal.length}`} sub={tr("with money in them")} />
          <Stat label={tr("Markets")} value={String(new Set(bal.map((b) => b.code)).size)} sub={`${new Set(bal.map((b) => b.currency)).size} currencies`} />
        </div>
      </div>

      <Card pad={false}>
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-y-0 text-sm">
            <thead>
              <tr>
                <th className={th}>
                  {sortBtn("country", "Country")}
                </th>
                <th className={th}>
                  {sortBtn("balance", "Balance")}
                </th>
                <th className={th}>
                  <span className="inline-flex items-center gap-1">
                    {tr("Currency")}
                    <select aria-label={tr("Filter by currency")} value={cur} onChange={(e) => setCur(e.target.value)} className="cursor-pointer rounded-md bg-transparent text-xs text-p-muted outline-none hover:text-p-fg">
                      <option value="all">{tr("All")}</option>
                      {[...new Set(bal.map((b) => b.currency))].sort().map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </span>
                </th>
                <th className={cx(th, "hidden md:table-cell")}>{tr("Active providers")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => (
                <tr key={b.key} onClick={() => setSel(b.key)} className={cx(trHover, sel === b.key && "bg-p-accent/8")}>
                  <td className={td}>
                    <span className="flex items-center gap-3">
                      <span className="text-xl leading-none">{b.flag}</span>
                      <span className="max-w-[180px] truncate font-medium">{b.country}</span>
                    </span>
                  </td>
                  <td className={cx(td, "tabular-nums", b.available === 0 && "text-p-faint")}>{dec2.format(b.available)}</td>
                  <td className={cx(td, "text-p-muted")}>{b.currency}</td>
                  <td className={cx(td, "hidden md:table-cell")}>
                    <span className="flex flex-wrap gap-1.5 text-p-fg">
                      {b.providers.map((id) => (
                        <ProviderMark key={id} id={id} />
                      ))}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Drawer
        open={!!selected}
        onClose={() => setSel(null)}
        title={selected && <span>{selected.flag} {selected.country} · {selected.currency}</span>}
        footer={
          selected && (
            <>
              <Button className="flex-1" onClick={() => { setFrom(selected.key); setSel(null); setConvert(true); }}>
                <ArrowLeftRight className="h-4 w-4" /> {tr("Convert")}
              </Button>
              <Link href="/portal/payouts?new=1" className="flex-1">
                <Button className="w-full" variant="primary" disabled={!selected.available}>
                  {tr("Pay out")}
                </Button>
              </Link>
            </>
          )
        }
      >
        {selected && (
          <div className="space-y-6">
            <div>
              <p className="text-xs text-p-muted">{tr("Available")}</p>
              <p className="text-3xl font-semibold tracking-tight tabular-nums">{money(selected.available, selected.currency)}</p>
              <p className="mt-1 text-sm text-p-faint tabular-nums">{tr("Held for payouts")} {money(selected.pending, selected.currency)} · {selected.name}</p>
            </div>
            <div>
              <p className="mb-3 text-sm font-semibold">{tr("Providers")}</p>
              <ul className="divide-y divide-p-line rounded-xl border border-p-line">
                {selected.providers.map((id) => (
                  <li key={id} className="flex items-center justify-between px-4 py-3">
                    <ProviderMark id={id} />
                    <span className="flex items-center gap-1.5 text-xs text-p-good">
                      <span className="h-1.5 w-1.5 rounded-full bg-p-good" /> {tr("Collections & payouts live")}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <dl className="grid grid-cols-2 gap-4 rounded-xl bg-p-panel2 p-4 text-sm">
              <div>
                <dt className="text-xs text-p-faint">{tr("Country code")}</dt>
                <dd className="mt-0.5">{selected.code}</dd>
              </div>
              <div>
                <dt className="text-xs text-p-faint">{tr("in USD")}</dt>
                <dd className="mt-0.5 tabular-nums">{usd(inUSD(selected.available, selected.currency))}</dd>
              </div>
            </dl>
          </div>
        )}
      </Drawer>

      <Card title={tr("Balance activity")} className="mt-4" pad={false}>
        <div className="overflow-x-auto pt-2">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className={th}>{tr("Description")}</th>
                <th className={cx(th, "hidden sm:table-cell")}>{tr("ID")}</th>
                <th className={cx(th, "text-right")}>{tr("Amount")}</th>
                <th className={cx(th, "text-right")}>{tr("Date")}</th>
              </tr>
            </thead>
            <tbody>
              {ledger.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-center text-sm text-p-muted">
                    {tr("No balance activity yet.")}
                  </td>
                </tr>
              )}
              {ledger.map((l) => (
                <tr key={l.id} className={trHover}>
                  <td className={td}>{l.desc}</td>
                  <td className={cx(td, "hidden font-mono text-xs text-p-muted sm:table-cell")}>{l.id}</td>
                  <td className={cx(td, "text-right font-medium tabular-nums", l.amount > 0 ? "text-p-good" : "")}>
                    {l.amount > 0 ? "+" : "−"}
                    {money(Math.abs(l.amount), l.currency)}
                  </td>
                  <td className={cx(td, "text-right text-p-muted tabular-nums")}>{date(l.t)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        open={convert}
        onClose={() => setConvert(false)}
        title={tr("Convert currency")}
        footer={
          <>
            <Button onClick={() => setConvert(false)}>{tr("Cancel")}</Button>
            <Button variant="primary" disabled title={tr("Currency conversion is coming soon")}>
              {tr("Convert")}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="rounded-xl bg-p-panel2 px-3 py-2.5 text-xs text-p-muted">{tr("Currency conversion is coming soon. The rate below is an indicative estimate only.")}</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label={tr("From")}>
              <Select value={from} onChange={(e) => setFrom(e.target.value)}>
                {bal.map((b) => (
                  <option key={b.key} value={b.key}>
                    {b.flag} {b.currency} · {b.country}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={tr("To")}>
              <Select value={to} onChange={(e) => setTo(e.target.value)}>
                {bal.map((b) => (
                  <option key={b.key} value={b.key}>
                    {b.flag} {b.currency} · {b.country}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label={`Amount (${fromBal.currency})`} hint={`Available: ${money(fromBal.available, fromBal.currency)}`}>
            <Input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))} placeholder="0" inputMode="decimal" />
          </Field>
          <div className="rounded-xl bg-p-panel2 p-4 text-sm">
            <div className="flex justify-between">
              <span className="text-p-muted">{tr("Rate")}</span>
              <span className="tabular-nums">
                1 {fromBal.currency} = {rate.toFixed(rate < 1 ? 5 : 2)} {toBal.currency}
              </span>
            </div>
            <div className="mt-1.5 flex justify-between font-medium">
              <span>{tr("You get")}</span>
              <span className="tabular-nums">{money(out, toBal.currency)}</span>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
}

/* ================= Settlements ================= */

export function Settlements() {
  const { settlements, now } = useLive();
  const accounts = useApi<{ data: { id: string; label: string; isDefault: boolean; details: { masked: string } }[] }>("/dashboard/payout-accounts");
  const def = accounts.data?.data.find((a) => a.isDefault);
  const paid30 = settlements.filter((s) => s.status === "paid" && s.date > now - 30 * 86_400_000);
  const pending = settlements.filter((s) => s.status === "scheduled" || s.status === "in_transit");

  return (
    <>
      <PageHeader
        title={tr("Settlements")}
        sub={tr("Transfers from your WisoPay balance to your bank or wallet.")}
        actions={
          <Button onClick={() => download("wisopay-settlements.csv", toCSV(settlements.map((s) => ({ id: s.id, date: new Date(s.date).toISOString(), amount: s.amount, currency: s.currency, payments: s.count, destination: s.bank, status: s.status }))))}>
            <Download className="h-4 w-4" /> {tr("Export")}
          </Button>
        }
      />
      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-p-line bg-p-panel p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[13px] text-p-muted">{tr("Schedule")}</p>
              <p className="mt-2 flex items-center gap-2 text-lg font-semibold">
                <CalendarClock className="h-5 w-5 text-p-faint" /> {tr("On request")}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-p-faint">
                <Landmark className="h-3.5 w-3.5" /> {def ? `${def.label} ${def.details.masked}` : tr("No payout account yet")}
              </p>
            </div>
            <Link href="/portal/settings?tab=accounts">
              <Button size="sm" variant="ghost">
                <Pencil className="h-3.5 w-3.5" /> {tr("Edit")}
              </Button>
            </Link>
          </div>
        </div>
        <Stat label={tr("Settled · 30 days")} value={usd(paid30.reduce((s, x) => s + inUSD(x.amount, x.currency), 0))} sub={`${paid30.length} transfers`} />
        <Stat label={tr("In progress")} value={usd(pending.reduce((s, x) => s + inUSD(x.amount, x.currency), 0))} sub={`${pending.length} settlements`} />
      </div>

      <Card pad={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className={th}>{tr("Date")}</th>
                <th className={th}>{tr("Amount")}</th>
                <th className={th}>{tr("Status")}</th>
                <th className={cx(th, "hidden md:table-cell")}>{tr("Payments")}</th>
                <th className={cx(th, "hidden sm:table-cell")}>{tr("Destination")}</th>
                <th className={cx(th, "hidden lg:table-cell text-right")}>{tr("ID")}</th>
              </tr>
            </thead>
            <tbody>
              {settlements.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-p-muted">
                    {tr("No settlements yet. Once you’re live, ask us to settle your balance to your payout account.")}
                  </td>
                </tr>
              )}
              {settlements.map((s) => (
                <tr key={s.id} className={trHover}>
                  <td className={cx(td, "tabular-nums")}>{date(s.date, false)}</td>
                  <td className={cx(td, "font-medium tabular-nums")}>{money(s.amount, s.currency)}</td>
                  <td className={td}>
                    <Status s={s.status} />
                  </td>
                  <td className={cx(td, "hidden text-p-muted tabular-nums md:table-cell")}>{s.count || "—"}</td>
                  <td className={cx(td, "hidden text-p-muted sm:table-cell")}>{s.bank}</td>
                  <td className={cx(td, "hidden text-right font-mono text-xs text-p-muted lg:table-cell")}>{s.id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

    </>
  );
}

/* ================= Analytics ================= */

export function Analytics() {
  const { payments, payouts, now, env } = useLive();
  const [range, setRange] = useState<"30" | "90">("30");
  const days = Number(range);
  const start = now - days * 86_400_000;
  const inRange = payments.filter((p) => p.createdAt >= start);
  const series = useMemo(() => dailySeries(payments, payouts, days, "collections", now), [payments, payouts, days, now]);

  const success = useMemo(() => {
    return series.map((d, i) => {
      const s = d.t - 86_400_000 + 1;
      const day = payments.filter((p) => p.createdAt > s && p.createdAt <= d.t + 1 && p.status !== "refunded");
      const ok = day.filter((p) => p.status === "succeeded").length;
      return { label: series[i] ? new Date(d.t).toUTCString().slice(5, 11) : "", v: day.length ? (ok / day.length) * 100 : 0 };
    });
  }, [series, payments]);

  const sum = (f: (p: (typeof payments)[number]) => boolean) => inRange.filter((p) => p.status === "succeeded" && f(p)).reduce((s, p) => s + inUSD(p.amount, p.currency), 0);
  const total = sum(() => true);
  const netVolume = useNetworkVolume(days);
  const customers = useApi<{ data: { last: number }[] }>("/dashboard/customers", env);

  const REASON: Record<string, string> = { PAYMENT_NOT_APPROVED: "Customer declined the prompt", INSUFFICIENT_BALANCE: "Insufficient balance", INVALID_PHONE_NUMBER: "Invalid phone number", NOT_FOUND_AT_PROVIDER: "Not received by the operator", UNKNOWN_ERROR: "Operator error" };
  const failed = inRange.filter((p) => p.status === "failed");
  const failCounts = new Map<string, number>();
  for (const p of failed) {
    const raw = (p as typeof p & { raw?: { status: string; failure: { code: string } | null } }).raw;
    const k = raw?.status === "EXPIRED" ? "Prompt timed out" : (REASON[raw?.failure?.code ?? ""] ?? raw?.failure?.code ?? "Other");
    failCounts.set(k, (failCounts.get(k) ?? 0) + 1);
  }
  const failReasons = [...failCounts].map(([label, n]) => ({ label, value: Math.round((n / failed.length) * 100) })).sort((a, b) => b.value - a.value);

  return (
    <>
      <PageHeader title={tr("Analytics")} sub={tr("Understand how, where and when your customers pay.")} actions={<Segmented layoutId="an-range" value={range} onChange={setRange} options={[{ value: "30", label: tr("30 days") }, { value: "90", label: tr("90 days") }]} />} />

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label={tr("Gross volume")} value={`${usd(total)}`} />
        <Stat label={tr("Successful payments")} value={inRange.filter((p) => p.status === "succeeded").length.toLocaleString("en-US")} />
        <Stat label={tr("Unique customers")} value={customers.data ? customers.data.data.filter((c) => c.last >= start).length.toLocaleString("en-US") : "—"} />
        <Stat label={tr("Failed payments")} value={inRange.filter((p) => p.status === "failed").length.toLocaleString("en-US")} />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card title={tr("Gross volume")}>
          <AreaChart data={series} height={220} />
        </Card>
        <Card title={tr("Daily success rate")}>
          <Bars data={success} height={220} min={Math.max(0, Math.min(...success.map((s) => s.v)) - 10)} />
          <p className="mt-3 text-xs text-p-faint">{tr("Share of payment attempts that succeeded each day.")}</p>
        </Card>
        <Card title={tr("Volume by network")}>
          {(netVolume ?? []).length ? <BarList items={(netVolume ?? []).map((n) => ({ label: n.label, value: n.value, dot: <NetworkDot name={n.label} /> })).sort((a, b) => b.value - a.value).slice(0, 8)} format={(v) => `${compact(v)} · ${((v / ((netVolume ?? []).reduce((s, n) => s + n.value, 0) || 1)) * 100).toFixed(0)}%`} /> : <p className="py-8 text-center text-sm text-p-muted">{netVolume === null ? tr("Loading…") : tr("No successful payments in this period.")}</p>}
        </Card>
        <Card title={tr("Why payments fail")}>
          {failReasons.length ? <BarList items={failReasons} format={(v) => `${v}%`} /> : <p className="py-8 text-center text-sm text-p-muted">{tr("No failed payments in this period.")}</p>}
          <p className="mt-4 text-xs text-p-faint">{tr("Tip: payment links with clear amounts reduce cancelled prompts by about a third.")}</p>
        </Card>
      </div>
    </>
  );
}

/** Available money summed per currency; wallets in the same currency in different markets add together. */
function balanceByCurrency(bal: { currency: string; available: number; code: string }[]) {
  const by = new Map<string, { currency: string; available: number; markets: number }>();
  for (const b of bal) {
    const cur = by.get(b.currency) ?? { currency: b.currency, available: 0, markets: 0 };
    cur.available += b.available;
    cur.markets += 1;
    by.set(b.currency, cur);
  }
  return [...by.values()].sort((a, b) => b.available - a.available);
}
