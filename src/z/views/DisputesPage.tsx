import { useEffect, useState } from "react";
import { Send } from "lucide-react";
import { api } from "../../api";
import { PageHeader, Card, Button, Empty, cx } from "../ui";
import { money } from "../data";

type Dispute = {
  id: string; transaction: string; amount: string; currency: string; status: string; reason: string;
  dueAt: string; createdAt: string; overdue: boolean; decision: string | null; customerPhone: string | null;
  messages?: { role: "customer" | "merchant" | "staff"; author: string | null; body: string; at: string }[];
};

const STATUS: Record<string, { label: string; cls: string }> = {
  OPEN: { label: "Reply needed", cls: "bg-p-warn/15 text-p-warn" },
  INVESTIGATING: { label: "Under review", cls: "bg-p-info/10 text-p-info" },
  REFUNDED: { label: "Refunded", cls: "bg-p-good/10 text-p-good" },
  WON: { label: "Closed in your favour", cls: "bg-p-good/10 text-p-good" },
};
const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/** Customer complaints about your payments. You have 5 days to reply; then WisoPay decides. */
export function DisputesPage() {
  const [rows, setRows] = useState<Dispute[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Dispute | null>(null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);

  useEffect(() => {
    api.disputes().then((r) => setRows(r.data as Dispute[])).catch(() => setRows([]));
  }, [tick]);

  useEffect(() => {
    if (!openId) { setDetail(null); return; }
    api.dispute(openId).then((d) => setDetail(d as Dispute)).catch(() => setDetail(null));
  }, [openId, tick]);

  const send = async () => {
    if (!openId || reply.trim().length < 2) return;
    setBusy(true); setError("");
    try {
      await api.disputeRespond(openId, reply.trim());
      setReply("");
      setTick((t) => t + 1);
    } catch (e: any) {
      setError(e?.message ?? "Couldn't send your reply");
    } finally {
      setBusy(false);
    }
  };

  const canReply = detail && (detail.status === "OPEN" || detail.status === "INVESTIGATING");

  return (
    <>
      <PageHeader title="Disputes" sub="Customer complaints about your payments. Reply within 5 days; if you don't, WisoPay decides." />

      {rows && rows.length === 0 && (
        <Empty title="No disputes" body="When a customer reports a problem with a payment, it shows here." />
      )}

      {rows && rows.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
          <Card pad={false}>
            <ul className="divide-y divide-p-line">
              {rows.map((d) => {
                const st = STATUS[d.status] ?? { label: d.status, cls: "bg-p-panel2 text-p-muted" };
                return (
                  <li key={d.id}>
                    <button onClick={() => setOpenId(d.id)} className={cx("w-full px-4 py-3 text-left hover:bg-p-panel2", openId === d.id && "bg-p-panel2")}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-p-fg">{money(Number(d.amount), d.currency)}</span>
                        <span className={cx("rounded-full px-2 py-0.5 text-[11px] font-medium", st.cls)}>{st.label}</span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-p-muted">{d.reason}</p>
                      <p className="mt-1 text-[11px] text-p-faint">{d.id} · opened {when(d.createdAt)}{d.status === "OPEN" && <> · reply by {when(d.dueAt)}</>}</p>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Card>

          <Card>
            {!openId && <p className="py-10 text-center text-sm text-p-muted">Choose a dispute to read it.</p>}
            {openId && !detail && <p className="py-10 text-center text-sm text-p-muted">Loading…</p>}
            {detail && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-base font-semibold text-p-fg">{money(Number(detail.amount), detail.currency)}</p>
                    <p className="text-xs text-p-muted">{detail.id} · payment {detail.transaction}</p>
                  </div>
                  <span className={cx("rounded-full px-2.5 py-1 text-xs font-medium", (STATUS[detail.status] ?? { cls: "" }).cls)}>{(STATUS[detail.status] ?? { label: detail.status }).label}</span>
                </div>
                {detail.status === "OPEN" && (
                  <p className="rounded-xl bg-p-warn/10 px-3 py-2 text-sm text-p-ink2">Please reply by <strong>{when(detail.dueAt)}</strong>. If there's no reply, WisoPay decides without your side.</p>
                )}
                {detail.status === "REFUNDED" && <p className="rounded-xl bg-p-panel2 px-3 py-2 text-sm text-p-ink2">WisoPay decided to refund the customer. Watch for the refund under Refunds.</p>}
                {detail.status === "WON" && <p className="rounded-xl bg-p-panel2 px-3 py-2 text-sm text-p-ink2">Closed in your favour. {detail.decision ?? ""}</p>}

                <div className="space-y-2">
                  {(detail.messages ?? []).map((m, i) => (
                    <div key={i} className={cx("max-w-[85%] whitespace-pre-line rounded-2xl px-3.5 py-2 text-sm", m.role === "merchant" ? "ml-auto bg-p-accent text-p-accent-ink" : "bg-p-panel2 text-p-fg")}>
                      <p className="mb-0.5 text-[11px] font-semibold opacity-80">
                        {m.role === "customer" ? "Customer" : m.role === "staff" ? `WisoPay · ${m.author ?? "team"}` : m.author ?? "You"} · {when(m.at)}
                      </p>
                      {m.body}
                    </div>
                  ))}
                </div>

                {canReply && (
                  <form onSubmit={(e) => { e.preventDefault(); void send(); }} className="space-y-2">
                    <textarea value={reply} onChange={(e) => setReply(e.target.value)} maxLength={2000} rows={3} placeholder="Your reply: what happened, and any proof (receipt, order number)"
                      className="w-full rounded-xl border border-p-line bg-transparent px-3 py-2 text-sm text-p-fg placeholder:text-p-faint focus:outline-none" />
                    {error && <p className="text-sm text-p-bad">{error}</p>}
                    <Button variant="primary" disabled={busy || reply.trim().length < 2}><Send className="h-4 w-4" /> {busy ? "Sending…" : "Send reply"}</Button>
                  </form>
                )}
              </div>
            )}
          </Card>
        </div>
      )}
    </>
  );
}
