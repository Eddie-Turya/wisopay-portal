import { tr } from "../i18n";

import { useEffect, useState } from "react";
import { Download, FileText } from "lucide-react";
import { date, money } from "../data";
import { useApi } from "../live";
import { downloadPortalFile, ApiError } from "../api";
import { Button, Card, Empty, PageHeader, Select, Stat, cx, td, th, useToast } from "../ui";

type LineType = "PAYMENT" | "PAYMENT_FEE" | "REFUND" | "WITHDRAWAL" | "WITHDRAWAL_FEE" | "WITHDRAWAL_RETURNED";
type Statement = {
  month: string;
  period: { from: string; to: string };
  openingBalance: number;
  closingBalance: number;
  summary: { paymentsCount: number; paymentsReceived: number; paymentFees: number; refunds: number; withdrawalsCount: number; withdrawalsRequested: number; withdrawalFees: number; withdrawalsReturned: number };
  lines: { at: string; type: LineType; description: string; reference: string | null; amount: number; balance: number }[];
};

const TYPE: Record<LineType, string> = {
  PAYMENT: "Payment",
  PAYMENT_FEE: "Payment fee",
  REFUND: "Refund",
  WITHDRAWAL: "Withdrawal",
  WITHDRAWAL_FEE: "Withdrawal fee",
  WITHDRAWAL_RETURNED: "Returned",
};

const monthLabel = (m: string) => {
  const [y, mo] = m.split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1, 1)).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
};

/** Monthly statements of the live balance: summary, every line, PDF and CSV downloads. */
export function Statements() {
  const toast = useToast();
  const months = useApi<{ data: string[] }>("/dashboard/statements");
  const [month, setMonth] = useState("");
  useEffect(() => {
    if (!month && months.data?.data.length) setMonth(months.data.data[0]);
  }, [months.data, month]);
  const st = useApi<Statement>(month ? `/dashboard/statements/${month}` : null);
  const s = st.data && st.data.month === month ? st.data : null;
  const [busy, setBusy] = useState<"" | "pdf" | "csv">("");

  const download = async (ext: "pdf" | "csv") => {
    setBusy(ext);
    try {
      await downloadPortalFile(`/statements/${month}.${ext}`, `wisopay-statement-${month}.${ext}`);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Download failed", "bad");
    }
    setBusy("");
  };

  return (
    <>
      <PageHeader
        title={tr("Statements")}
        sub={tr("Every movement on your live balance, month by month. We also email last month's statement on the 1st.")}
        actions={
          <>
            <Select aria-label={tr("Month")} value={month} onChange={(e) => setMonth(e.target.value)} className="w-44">
              {(months.data?.data ?? []).map((m) => (
                <option key={m} value={m}>
                  {monthLabel(m)}
                </option>
              ))}
            </Select>
            <Button disabled={!s || !!busy} onClick={() => void download("csv")}>
              <Download className="h-4 w-4" /> {busy === "csv" ? tr("Preparing…") : tr("CSV")}
            </Button>
            <Button variant="primary" disabled={!s || !!busy} onClick={() => void download("pdf")}>
              <FileText className="h-4 w-4" /> {busy === "pdf" ? tr("Preparing…") : tr("Download PDF")}
            </Button>
          </>
        }
      />

      {(months.error || st.error) && <p className="mb-4 text-sm text-p-bad">{months.error || st.error}</p>}

      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label={tr("Opening balance")} value={s ? money(s.openingBalance, "TZS") : "—"} sub={s ? `${s.period.from}` : undefined} />
        <Stat label={tr("Payments received")} value={s ? money(s.summary.paymentsReceived, "TZS") : "—"} sub={s ? `${s.summary.paymentsCount} payments · fees ${money(s.summary.paymentFees, "TZS")}` : undefined} />
        <Stat label={tr("Withdrawals")} value={s ? money(s.summary.withdrawalsRequested - s.summary.withdrawalsReturned + s.summary.withdrawalFees, "TZS") : "—"} sub={s ? `${s.summary.withdrawalsCount} requested · fees ${money(s.summary.withdrawalFees, "TZS")}` : undefined} />
        <Stat label={tr("Closing balance")} value={s ? money(s.closingBalance, "TZS") : "—"} sub={s ? `${s.period.to}` : undefined} />
      </div>

      {s && (
        <Card title={tr("Summary")} className="mb-4">
          <dl className="grid grid-cols-1 gap-x-10 gap-y-2 text-sm sm:grid-cols-2">
            {[
              ["Opening balance", s.openingBalance, true],
              [`Payments received (${s.summary.paymentsCount})`, s.summary.paymentsReceived],
              ["Payment fees", -s.summary.paymentFees],
              ["Refunds", -s.summary.refunds],
              [`Withdrawals requested (${s.summary.withdrawalsCount})`, -s.summary.withdrawalsRequested],
              ["Withdrawal fees", -s.summary.withdrawalFees],
              ["Withdrawals returned", s.summary.withdrawalsReturned],
              ["Closing balance", s.closingBalance, true],
            ].map(([k, v, s2]) => ({ k, v, strong: s2 === true })).map(({ k, v, strong }) => (
              <div key={String(k)} className="flex justify-between border-b border-p-line py-1.5">
                <dt className={cx(strong ? "font-semibold" : "text-p-muted")}>{String(k)}</dt>
                <dd className={cx("tabular-nums", strong && "font-semibold")}>{money(Number(v), "TZS")}</dd>
              </div>
            ))}
          </dl>
        </Card>
      )}

      <Card pad={false}>
        {!s ? (
          <p className="px-5 py-10 text-center text-sm text-p-muted">{st.loading || months.loading ? tr("Loading…") : tr("Choose a month.")}</p>
        ) : s.lines.length === 0 ? (
          <Empty title={tr("No movements this month")} body={tr("Payments, fees, refunds and withdrawals on your live balance appear here.")} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className={th}>{tr("Date")}</th>
                  <th className={th}>{tr("Type")}</th>
                  <th className={th}>{tr("Description")}</th>
                  <th className={cx(th, "hidden md:table-cell")}>{tr("Reference")}</th>
                  <th className={cx(th, "text-right")}>{tr("Amount")}</th>
                  <th className={cx(th, "text-right")}>{tr("Balance")}</th>
                </tr>
              </thead>
              <tbody>
                {s.lines.map((l, i) => (
                  <tr key={i} className="border-t border-p-line">
                    <td className={cx(td, "text-p-muted tabular-nums")}>{date(Date.parse(l.at) + 3 * 3_600_000)}</td>
                    <td className={td}>
                      <span className={cx("rounded-md px-1.5 py-0.5 text-xs font-medium", l.amount >= 0 ? "bg-p-good/10 text-p-good" : l.type.endsWith("FEE") ? "bg-p-warn/15 text-p-warn" : "bg-p-panel2 text-p-muted")}>{TYPE[l.type]}</span>
                    </td>
                    <td className={cx(td, "max-w-[320px] truncate")}>{l.description}</td>
                    <td className={cx(td, "hidden font-mono text-xs text-p-muted md:table-cell")}>{l.reference ?? "—"}</td>
                    <td className={cx(td, "text-right font-medium tabular-nums", l.amount > 0 && "text-p-good")}>
                      {l.amount > 0 ? "+" : ""}
                      {Math.round(l.amount).toLocaleString("en-US")}
                    </td>
                    <td className={cx(td, "text-right tabular-nums text-p-muted")}>{Math.round(l.balance).toLocaleString("en-US")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <p className="mt-3 text-xs text-p-faint">{tr("Live payments only, in TZS. Dates in East Africa Time. A withdrawal's fee is listed separately from the amount sent to you.")}</p>
    </>
  );
}
