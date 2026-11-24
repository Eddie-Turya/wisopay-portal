import { tr } from "../i18n";

import { useEffect, useMemo, useState } from "react";
import { Download, Mail, RotateCcw, Search, Smartphone, CreditCard, Landmark } from "lucide-react";
import { date, download, money, toCSV, NETWORKS, type Payment, type PayStatus } from "../data";
import { useLive } from "../live";
import { api, ApiError } from "../api";
import { MARKETS, marketOf } from "../coverage";
import { Button, Card, CopyText, Drawer, Empty, Input, Modal, NetworkDot, PageHeader, Pagination, Segmented, Select, Status, cx, td, th, trHover, useToast } from "../ui";

const PER = 12;
type F = "all" | PayStatus;

export function Payments() {
  const toast = useToast();
  const live = useLive();
  const rows = live.payments;
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<F>("all");
  const [net, setNet] = useState("all");
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState<Payment | null>(null);
  const [refund, setRefund] = useState<Payment | null>(null);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length };
    for (const p of rows) c[p.status] = (c[p.status] ?? 0) + 1;
    return c;
  }, [rows]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter(
      (p) =>
        (status === "all" || p.status === status) &&
        (net === "all" || p.network === net) &&
        (!s || [p.id, p.ref, p.customer, p.phone, p.email, String(p.amount)].some((x) => x.toLowerCase().includes(s))),
    );
  }, [rows, q, status, net]);

  const pages = Math.ceil(filtered.length / PER);
  const view = filtered.slice(page * PER, page * PER + PER);

  const exportCSV = () => {
    download(
      "wisopay-payments.csv",
      toCSV(filtered.map((p) => ({ id: p.id, reference: p.ref, amount: p.amount, currency: p.currency, fee: p.fee, status: p.status, customer: p.customer, phone: p.phone, network: p.network, date: new Date(p.createdAt).toISOString() }))),
    );
    toast(`Exported ${filtered.length} payments`);
  };

  const [refunding, setRefunding] = useState(false);
  const doRefund = async (p: Payment) => {
    setRefunding(true);
    try {
      await api(`/dashboard/transactions/${p.id}/refund`, { body: {}, env: live.env, idempotent: true });
      setRefund(null);
      setOpen(null);
      toast(`Refund of ${money(p.amount, p.currency)} to ${p.customer} is processing`);
      void live.reload();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Refund failed", "bad");
    }
    setRefunding(false);
  };

  return (
    <>
      <PageHeader
        title={tr("Payments")}
        sub={tr("Every payment your customers have made, across all networks.")}
        actions={
          <Button onClick={exportCSV}>
            <Download className="h-4 w-4" /> {tr("Export CSV")}
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="overflow-x-auto">
          <Segmented
            layoutId="pay-status"
            value={status}
            onChange={(v) => {
              setStatus(v);
              setPage(0);
            }}
            options={(["all", "succeeded", "pending", "failed", "refunded"] as F[]).map((s) => ({ value: s, label: s === "all" ? "All" : s[0].toUpperCase() + s.slice(1), count: counts[s] ?? 0 }))}
          />
        </div>
        <div className="ml-auto flex w-full gap-2 sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-p-faint" />
            <Input
              placeholder={tr("Search name, phone, ID…")}
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(0);
              }}
              className="pl-9"
            />
          </div>
          <Select
            aria-label={tr("Network")}
            value={net}
            onChange={(e) => {
              setNet(e.target.value);
              setPage(0);
            }}
            className="w-40"
          >
            <option value="all">{tr("All networks")}</option>
            {MARKETS.map((m) => (
              <optgroup key={m.key} label={`${m.flag} ${m.name} · ${m.currency}`}>
                {NETWORKS.filter((n) => n.country === m.code && n.currency === m.currency).map((n) => (
                  <option key={n.name} value={n.name}>
                    {n.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </Select>
        </div>
      </div>

      <Card pad={false}>
        {view.length === 0 ? (
          <Empty title={rows.length ? "No payments found" : "No payments yet"} body={rows.length ? "Try a different search or clear the filters." : "Payments you collect through the API appear here."} action={<Button onClick={() => { setQ(""); setStatus("all"); setNet("all"); }}>{tr("Clear filters")}</Button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className={th}>{tr("Amount")}</th>
                  <th className={th}>{tr("Status")}</th>
                  <th className={th}>{tr("Customer")}</th>
                  <th className={cx(th, "hidden lg:table-cell")}>{tr("Method")}</th>
                  <th className={cx(th, "hidden xl:table-cell")}>{tr("Reference")}</th>
                  <th className={cx(th, "text-right")}>{tr("Date")}</th>
                </tr>
              </thead>
              <tbody>
                {view.map((p) => (
                  <tr key={p.id} className={trHover} onClick={() => setOpen(p)}>
                    <td className={cx(td, "font-medium tabular-nums")}>
                      {money(p.amount, p.currency)}
                    </td>
                    <td className={td}>
                      <Status s={p.status} />
                    </td>
                    <td className={td}>
                      <p>{p.customer}</p>
                      <p className="text-xs text-p-faint">{p.phone}</p>
                    </td>
                    <td className={cx(td, "hidden text-p-muted lg:table-cell")}>
                      <span className="flex items-center gap-2">
                        <NetworkDot name={p.network} />
                        {p.network}
                      </span>
                    </td>
                    <td className={cx(td, "hidden font-mono text-xs text-p-muted xl:table-cell")}>{p.ref}</td>
                    <td className={cx(td, "text-right text-p-muted tabular-nums")}>{date(p.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} pages={pages} total={filtered.length} onPage={setPage} />
      </Card>

      <Drawer
        open={!!open}
        onClose={() => setOpen(null)}
        title={tr("Payment details")}
        footer={
          open && (
            <>
              <Button className="flex-1" disabled={!open.email} title={open.email ? undefined : "No customer email on this payment"} onClick={() => toast(tr("Email receipts aren’t available yet"), "info")}>
                <Mail className="h-4 w-4" /> {tr("Send receipt")}
              </Button>
              <Button className="flex-1" variant="danger" disabled={open.status !== "succeeded"} onClick={() => setRefund(open)}>
                <RotateCcw className="h-4 w-4" /> {tr("Refund")}
              </Button>
            </>
          )
        }
      >
        {open && <PaymentDetail p={open} />}
      </Drawer>

      <Modal
        open={!!refund}
        onClose={() => setRefund(null)}
        title={tr("Refund payment")}
        footer={
          <>
            <Button onClick={() => setRefund(null)}>{tr("Cancel")}</Button>
            <Button variant="danger" disabled={refunding} onClick={() => refund && void doRefund(refund)}>
              {tr("Refund")} {refund && money(refund.amount, refund.currency)}
            </Button>
          </>
        }
      >
        {refund && (
          <p className="text-sm text-p-muted">
            {money(refund.amount, refund.currency)} {tr("will be sent back to")} <span className="font-medium text-p-fg">{refund.customer}</span> {tr("on")} {refund.network} ({refund.phone}{tr("). This can’t be undone.")}
          </p>
        )}
      </Modal>
    </>
  );
}

const STEP_LABEL: Record<string, string> = {
  CREATED: "Payment created",
  PENDING: "Prompt sent to the customer’s phone",
  PROCESSING: "Operator processing",
  SUCCESS: "Customer approved · funds added to balance",
  FAILED: "Payment failed",
  EXPIRED: "Customer didn’t approve in time",
  REVERSED: "Reversed by the operator",
  REFUNDED: "Fully refunded",
  PARTIALLY_REFUNDED: "Partly refunded",
};

function PaymentDetail({ p }: { p: Payment }) {
  const { env } = useLive();
  const MIcon = p.method === "card" ? CreditCard : p.method === "bank" ? Landmark : Smartphone;
  const [events, setEvents] = useState<{ to: string; at: string }[] | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [payer, setPayer] = useState<{ phone: string; network: string } | null>(null);
  useEffect(() => {
    api<{ events: { to: string; at: string }[]; failure: { message: string | null; code: string } | null; phoneNumber?: string; network?: string }>(`/dashboard/transactions/${p.id}`, { env })
      .then((d) => {
        setEvents(d.events);
        if (d.phoneNumber) setPayer({ phone: `+${d.phoneNumber}`, network: d.network ?? "" });
        setFailure(d.failure ? (d.failure.message ?? d.failure.code) : null);
      })
      .catch(() => setEvents([]));
  }, [p.id, env]);
  const steps = (events ?? []).map((e) => ({ t: e.to === "FAILED" && failure ? `Payment failed · ${failure}` : (STEP_LABEL[e.to] ?? e.to), at: Date.parse(e.at), done: true, bad: ["FAILED", "EXPIRED", "REVERSED"].includes(e.to) }));
  return (
    <div className="space-y-6">
      <div>
        <Status s={p.status} />
        <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums">{money(p.amount, p.currency)}</p>
        <p className="mt-1 text-sm text-p-muted">
          {tr("from")} {payer?.phone ?? p.customer} · {date(p.createdAt)}
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-4 rounded-xl bg-p-panel2 p-4 text-sm">
        <Item k="Payment ID" v={<CopyText text={p.id} />} />
        <Item k="Reference" v={<CopyText text={p.ref} />} />
        <Item k="Method" v={<span className="flex items-center gap-1.5"><MIcon className="h-3.5 w-3.5" />{payer?.network || p.network}</span>} />
        <Item k="Country" v={`${marketOf(p.country)?.flag ?? ""} ${marketOf(p.country)?.name ?? p.country}`} />
        <Item k="Fee" v={<span className="tabular-nums">{money(p.fee, p.currency)}</span>} />
        <Item k="Net" v={<span className="tabular-nums">{money(p.amount - p.fee, p.currency)}</span>} />
      </dl>

      <div>
        <p className="mb-3 text-sm font-semibold">{tr("Customer")}</p>
        <dl className="grid grid-cols-1 gap-2 text-sm">
          <Row k="Name" v={payer?.phone ?? p.customer} />
          <Row k="Phone" v={payer?.phone ?? p.phone} />
          <Row k="Email" v={p.email || "—"} />
        </dl>
      </div>

      <div>
        <p className="mb-3 text-sm font-semibold">{tr("Timeline")}</p>
        {events === null && <p className="text-xs text-p-faint">{tr("Loading…")}</p>}
        <ol className="relative ml-1.5 space-y-4 border-l border-p-line pl-5">
          {steps.map((s) => (
            <li key={s.t} className="relative">
              <span className={cx("absolute top-1 -left-[26px] h-3 w-3 rounded-full ring-4 ring-p-panel", s.bad ? "bg-p-bad" : s.done ? "bg-p-good" : "bg-p-warn")} />
              <p className="text-sm">{s.t}</p>
              <p className="text-xs text-p-faint tabular-nums">{date(s.at)}</p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

const Item = ({ k, v }: { k: string; v: React.ReactNode }) => (
  <div className="min-w-0">
    <dt className="text-xs text-p-faint">{k}</dt>
    <dd className="mt-0.5 truncate">{v}</dd>
  </div>
);
const Row = ({ k, v }: { k: string; v: string }) => (
  <div className="flex justify-between gap-4">
    <dt className="text-p-muted">{k}</dt>
    <dd className="truncate">{v}</dd>
  </div>
);
