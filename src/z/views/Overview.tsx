import { tr } from "../i18n";

import Link from "../next";
import { useMemo, useState } from "react";
import { ArrowRight, ArrowUpFromLine, Link2, Info, Smartphone } from "lucide-react";
import { compact, date, inUSD, money, usd } from "../data";
import { dailySeries, totalUSD, useLive, useNetworkVolume } from "../live";
import { AreaChart, BarList } from "../charts";
import { Button, Card, NetworkDot, Segmented, Stat, Status, cx, td, th, trHover } from "../ui";
import { usePortal } from "../Shell";
import { MARKETS } from "../coverage";
import { useAccount } from "../account";
import { Onboarding } from "./Onboarding";

type Kind = "collections" | "payouts" | "all";
type Range = "7" | "30" | "90";

export function Overview() {
  const { business } = usePortal();
  const { payments, payouts, settlements, balances, now } = useLive();
  const [kind, setKind] = useState<Kind>("collections");
  const [range, setRange] = useState<Range>("30");
  const days = Number(range);

  const series = useMemo(() => dailySeries(payments, payouts, days, kind, now), [payments, payouts, days, kind, now]);
  const prev = useMemo(() => dailySeries(payments, payouts, days * 2, kind, now).slice(0, days), [payments, payouts, days, kind, now]);
  const total = series.reduce((s, d) => s + d.v, 0);
  const prevTotal = prev.reduce((s, d) => s + d.v, 0);
  const count = series.reduce((s, d) => s + (d.n ?? 0), 0);

  const start = series[0].t;
  const inRange = payments.filter((p) => p.createdAt >= start);
  const ok = inRange.filter((p) => p.status === "succeeded").length;
  const tried = inRange.filter((p) => p.status !== "refunded").length;
  const successRate = tried ? (ok / tried) * 100 : 0;
  const next = settlements.find((x) => x.status === "scheduled" || x.status === "in_transit") ?? settlements[0];

  const netVolume = useNetworkVolume(days);
  const byNetwork = (netVolume ?? []).map((n) => ({ label: n.label, value: n.value, dot: <NetworkDot name={n.label} /> })).sort((a, b) => b.value - a.value).slice(0, 8);
  const markets = [...new Set(inRange.filter((p) => p.status === "succeeded").map((p) => p.country))];

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{tr("Overview")}</h1>
          <p className="mt-1 text-sm text-p-muted">{tr("Welcome back,")} {business}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/portal/collect">
            <Button>
              <Smartphone className="h-4 w-4" /> {tr("Collect payment")}
            </Button>
          </Link>
          <Link href="/portal/payment-links">
            <Button variant="primary">
              <Link2 className="h-4 w-4" /> {tr("Create payment link")}
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_340px]">
        {/* Main chart */}
        <Card
          title={tr("Payments overview")}
          action={
            <div className="hidden flex-wrap gap-2 sm:flex">
              <Segmented layoutId="ov-kind" value={kind} onChange={setKind} options={[{ value: "collections", label: tr("Collections") }, { value: "payouts", label: tr("Payouts") }, { value: "all", label: tr("All") }]} />
              <Segmented layoutId="ov-range" value={range} onChange={setRange} options={[{ value: "7", label: tr("7d") }, { value: "30", label: tr("30d") }, { value: "90", label: tr("90d") }]} />
            </div>
          }
        >
          <div className="mb-4 flex flex-wrap gap-2 sm:hidden">
            <Segmented layoutId="ov-kind-m" value={kind} onChange={setKind} options={[{ value: "collections", label: tr("In") }, { value: "payouts", label: tr("Out") }, { value: "all", label: tr("All") }]} />
            <Segmented layoutId="ov-range-m" value={range} onChange={setRange} options={[{ value: "7", label: tr("7d") }, { value: "30", label: tr("30d") }, { value: "90", label: tr("90d") }]} />
          </div>
          <div className="mb-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-p-line bg-p-line sm:grid-cols-3">
            <div className="bg-p-panel2 p-4">
              <p className="text-xs text-p-muted">{tr("Volume")}</p>
              <p className="mt-1 text-xl font-semibold tracking-tight tabular-nums">{usd(total)}</p>
              <p className={cx("mt-0.5 text-xs font-medium", total >= prevTotal ? "text-p-good" : "text-p-bad")}>
                {total >= prevTotal ? "↑" : "↓"} {prevTotal ? Math.abs(((total - prevTotal) / prevTotal) * 100).toFixed(1) : "0"}{tr("% vs previous")} {days}{tr("d")}
              </p>
            </div>
            <div className="bg-p-panel2 p-4">
              <p className="text-xs text-p-muted">{tr("Transactions")}</p>
              <p className="mt-1 text-xl font-semibold tracking-tight tabular-nums">{count.toLocaleString("en-US")}</p>
              <p className="mt-0.5 text-xs text-p-faint">{tr("Successful only")}</p>
            </div>
            <div className="col-span-2 bg-p-panel2 p-4 sm:col-span-1">
              <p className="text-xs text-p-muted">{tr("Active markets")}</p>
              <p className="mt-1 truncate text-xl font-semibold tracking-tight">
                {markets.length} <span className="text-base">{markets.slice(0, 6).map((c) => MARKETS.find((m) => m.code === c)?.flag).join(" ")}</span>
              </p>
              <p className="mt-0.5 text-xs text-p-faint">{tr("Tanzania · TZS")}</p>
            </div>
          </div>
          <AreaChart data={series} countLabel={kind === "payouts" ? "payouts" : "transactions"} />
          <p className="mt-3 flex items-center gap-1.5 text-xs text-p-faint">
            <Info className="h-3.5 w-3.5" /> {tr("Completed payments in TZS.")}
          </p>
        </Card>

        {/* Balance card */}
        <div className="grid grid-cols-1 gap-4">
          <Card title={tr("Balance")}>
            <div className="rounded-xl bg-p-panel2 p-4">
              <p className="text-xs text-p-muted">{tr("Available to withdraw")}</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">{usd(totalUSD(balances, "available"))}</p>
              <p className="text-xs text-p-faint tabular-nums">+ {usd(totalUSD(balances, "pending"))} {tr("held for withdrawals")}</p>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <dt className="text-p-faint">{next ? tr("Latest withdrawal") : tr("Withdrawals")}</dt>
                  <dd className="mt-0.5 font-medium">{next ? date(next.date) : tr("None yet")}</dd>
                </div>
                <div>
                  <dt className="text-p-faint">{tr("Amount")}</dt>
                  <dd className="mt-0.5 font-medium tabular-nums">{next ? money(next.amount, next.currency) : "—"}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-p-faint">{tr("Sent to")}</dt>
                  <dd className="mt-0.5 font-medium">{next?.bank ?? "Add a payout account in Settings"}</dd>
                </div>
              </dl>
            </div>
            <Link href="/portal/settlements?withdraw=1" className="mt-4 block">
              <Button variant="primary" className="w-full">
                <ArrowUpFromLine className="h-4 w-4" /> {tr("Withdraw")}
              </Button>
            </Link>
            <Link href="/portal/balances" className="mt-3 flex items-center justify-center gap-1 text-[13px] text-p-muted hover:text-p-fg">
              {tr("View all balances")} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Card>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label={tr("Success rate")} value={tried ? `${successRate.toFixed(1)}%` : "—"} sub={`last ${days}d`} />
        <Stat label={tr("Avg. payment")} value={usd(ok ? inRange.filter((p) => p.status === "succeeded").reduce((s, p) => s + inUSD(p.amount, p.currency), 0) / ok : 0)} sub={tr("per transaction")} />
        <Stat label={tr("Paid out")} value={usd(payouts.filter((p) => p.createdAt >= start && p.status === "paid").reduce((s, p) => s + inUSD(p.amount, p.currency), 0))} sub={`last ${days}d`} />
        <Stat label={tr("Refunds")} value={String(inRange.filter((p) => p.status === "refunded").length)} sub={`last ${days}d`} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_380px]">
        <Card
          title={tr("Recent payments")}
          pad={false}
          action={
            <Link href="/portal/payments" className="flex items-center gap-1 text-[13px] text-p-muted hover:text-p-fg">
              {tr("View all")} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        >
          <div className="overflow-x-auto pt-2">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className={th}>{tr("Amount")}</th>
                  <th className={th}>{tr("Status")}</th>
                  <th className={th}>{tr("Customer")}</th>
                  <th className={cx(th, "hidden md:table-cell")}>{tr("Network")}</th>
                  <th className={cx(th, "text-right")}>{tr("Date")}</th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-sm text-p-muted">
                      {tr("No payments yet. Collect one with a USSD push, a payment link or your API key.")}
                    </td>
                  </tr>
                )}
                {payments.slice(0, 7).map((p) => (
                  <tr key={p.id} className={trHover}>
                    <td className={cx(td, "font-medium tabular-nums")}>{money(p.amount, p.currency)}</td>
                    <td className={td}>
                      <Status s={p.status} />
                    </td>
                    <td className={td}>{p.customer}</td>
                    <td className={cx(td, "hidden text-p-muted md:table-cell")}>
                      <span className="flex items-center gap-2">
                        <NetworkDot name={p.network} />
                        {p.network}
                      </span>
                    </td>
                    <td className={cx(td, "text-right text-p-muted tabular-nums")}>{date(p.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title={tr("Volume by network")}>
          {netVolume === null ? <p className="py-8 text-center text-sm text-p-muted">{tr("Loading…")}</p> : byNetwork.length ? <BarList items={byNetwork} format={(v) => `${compact(v)}`} /> : <p className="py-8 text-center text-sm text-p-muted">{tr("No successful payments in this period.")}</p>}
        </Card>
      </div>
    </>
  );
}

/** Home: setup checklist until verified, then the full overview. */
export function Home() {
  const { verified } = useAccount();
  return verified ? <Overview /> : <Onboarding />;
}
