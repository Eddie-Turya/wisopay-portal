import { tr } from "../i18n";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "../next";
import { Download, Plus, Search, Upload, FileSpreadsheet } from "lucide-react";
import { date, download, money, toCSV, type PayoutStatus } from "../data";
import { networkLabel, useLive } from "../live";
import { api, ApiError } from "../api";
import { Avatar, Button, Card, CurrencyCard, Field, Input, Modal, PageHeader, Pagination, Segmented, Select, Stat, Status, cx, td, th, trHover, useToast } from "../ui";

const PER = 12;
// WisoPay payout fee by plan, plus the operator's own payout fee (≈1%, passed through at cost; the API returns the exact fee)
const ZP_PAYOUT: Record<string, number> = { DEVELOPER: 0.02, BUSINESS: 0.015, CUSTOM: 0.015 };
const NETWORK_PAYOUT = 0.01;

export function Payouts() {
  const toast = useToast();
  const router = useRouter();
  const params = useSearchParams();
  const live = useLive();
  const rows = live.payouts;
  const [status, setStatus] = useState<"all" | PayoutStatus>("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [bulk, setBulk] = useState(false);
  const newOpen = params.get("new") === "1";
  const setNewOpen = (v: boolean) => router.replace(v ? "/portal/payouts?new=1" : "/portal/payouts", { scroll: false });

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter((p) => (status === "all" || p.status === status) && (!s || (p.recipient + p.account + p.id).toLowerCase().includes(s)));
  }, [rows, status, q]);
  const pages = Math.ceil(filtered.length / PER);

  const month = rows.filter((p) => p.createdAt > live.now - 30 * 86_400_000 && p.status === "paid");

  const create = async (b: PayoutInput) => {
    try {
      await api("/dashboard/payouts", { body: b.body, env: live.env, idempotent: true });
      setNewOpen(false);
      toast(`Payout of ${money(Number(b.body.amount), b.body.currency)} to ${b.label} is processing`);
      void live.reload();
      setTimeout(() => void live.reload(), 4000);
      return null;
    } catch (e) {
      return e instanceof ApiError ? e.message : "Payout failed";
    }
  };

  return (
    <>
      <PageHeader
        title={tr("Payouts")}
        sub={tr("Send money to mobile money wallets in seconds.")}
        actions={
          <>
            <Button onClick={() => setBulk(true)} disabled title={tr("Bulk payouts are coming soon")}>
              <Upload className="h-4 w-4" /> {tr("Bulk payout")}
            </Button>
            <Button variant="primary" onClick={() => setNewOpen(true)}>
              <Plus className="h-4 w-4" /> {tr("New payout")}
            </Button>
          </>
        }
      />

      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <CurrencyCard
          title={tr("Available balance")}
          sub={tr("Each currency on its own. Nothing is converted.")}
          empty={tr("No wallets yet")}
          rows={sumByCurrency(live.balances.map((b) => ({ currency: b.currency, amount: Number(b.available) }))).map((v) => ({ currency: v.currency, value: money(v.amount, v.currency), detail: tr("all wallets") }))}
        />
        <CurrencyCard
          title={tr("Paid out · 30 days")}
          sub={tr("Each currency as paid, not converted")}
          empty={tr("No payouts in the last 30 days")}
          rows={sumByCurrency(month.map((p) => ({ currency: p.currency, amount: p.amount }))).map((v) => ({ currency: v.currency, value: money(v.amount, v.currency), detail: `${v.count} payouts` }))}
        />
      </div>
      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-2">
        <Stat label={tr("Processing")} value={String(rows.filter((p) => p.status === "processing").length)} sub={tr("usually under 30s")} />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Segmented
          layoutId="po-status"
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(0);
          }}
          options={[
            { value: "all", label: tr("All") },
            { value: "paid", label: tr("Paid") },
            { value: "processing", label: tr("Processing") },
            { value: "failed", label: tr("Failed") },
          ]}
        />
        <div className="ml-auto flex w-full gap-2 sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-p-faint" />
            <Input placeholder={tr("Search recipient…")} value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} className="pl-9" />
          </div>
          <Button aria-label={tr("Export CSV")} onClick={() => download("wisopay-payouts.csv", toCSV(filtered.map((p) => ({ id: p.id, recipient: p.recipient, account: p.account, network: p.network, amount: p.amount, fee: p.fee, status: p.status, date: new Date(p.createdAt).toISOString() }))))}>
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card pad={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className={th}>{tr("Recipient")}</th>
                <th className={th}>{tr("Amount")}</th>
                <th className={th}>{tr("Status")}</th>
                <th className={cx(th, "hidden md:table-cell")}>{tr("Destination")}</th>
                <th className={cx(th, "hidden lg:table-cell")}>{tr("Note")}</th>
                <th className={cx(th, "text-right")}>{tr("Date")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-p-muted">
                    {rows.length ? tr("No payouts match.") : tr("No payouts yet. Send money to any mobile wallet from your balance.")}
                  </td>
                </tr>
              )}
              {filtered.slice(page * PER, page * PER + PER).map((p) => (
                <tr key={p.id} className={trHover}>
                  <td className={td}>
                    <span className="flex items-center gap-3">
                      <Avatar name={p.recipient} />
                      <span>{p.recipient}</span>
                    </span>
                  </td>
                  <td className={cx(td, "font-medium tabular-nums")}>{money(p.amount, p.currency)}</td>
                  <td className={td}>
                    <Status s={p.status} />
                  </td>
                  <td className={cx(td, "hidden text-p-muted md:table-cell")}>
                    {p.network} · {p.account}
                  </td>
                  <td className={cx(td, "hidden text-p-muted lg:table-cell")}>{p.note}</td>
                  <td className={cx(td, "text-right text-p-muted tabular-nums")}>{date(p.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pages={pages} total={filtered.length} onPage={setPage} />
      </Card>

      <NewPayout open={newOpen} onClose={() => setNewOpen(false)} onCreate={create} />

      <Modal
        open={bulk}
        onClose={() => setBulk(false)}
        title={tr("Bulk payout")}
        footer={
          <>
            <Button onClick={() => setBulk(false)}>{tr("Cancel")}</Button>
            <Button
              variant="primary"
              onClick={() => {
                setBulk(false);
                toast(tr("Template downloaded"), "info");
                download("wisopay-bulk-template.csv", "name,phone_or_account,network,amount,note\nJuma Mollel,+255688410902,Airtel Money,25000,Rider earnings\n");
              }}
            >
              {tr("Download template")}
            </Button>
          </>
        }
      >
        <div className="grid place-items-center rounded-2xl border-2 border-dashed border-p-line bg-p-panel2 px-6 py-10 text-center">
          <FileSpreadsheet className="h-8 w-8 text-p-faint" />
          <p className="mt-3 text-sm font-medium">{tr("Drop a CSV file here")}</p>
          <p className="mt-1 text-xs text-p-muted">{tr("Up to 5,000 recipients per file. We’ll check every row before anything is sent.")}</p>
        </div>
        <p className="mt-4 text-xs text-p-faint">{tr("Columns: name, phone_or_account, network, amount, note")}</p>
      </Modal>
    </>
  );
}

type PayoutInput = { label: string; body: { amount: string; currency: string; network: string; phoneNumber: string; metadata?: Record<string, string> } };

function NewPayout({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (p: PayoutInput) => Promise<string | null> }) {
  const live = useLive();
  const home = live.me?.merchant.country ?? "TZ";
  const nets = live.networks.filter((n) => n.status === "OPERATIONAL").sort((a, b) => Number(b.country === home) - Number(a.country === home) || a.country.localeCompare(b.country));
  const [name, setName] = useState("");
  const [net, setNet] = useState("");
  const [acc, setAcc] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const network = nets.find((n) => n.code === net) ?? nets[0];
  const currency = network?.currency ?? "TZS";
  const wallet = live.balances.find((b) => b.currency === currency);
  const amt = Number(amount.replace(/,/g, "")) || 0;
  const rate = ZP_PAYOUT[live.me?.merchant.plan ?? "BUSINESS"];
  const zpFee = amt * rate;
  const netFee = amt * NETWORK_PAYOUT;
  const fee = zpFee + netFee;
  const valid = !!network && name.trim() && acc.replace(/\D/g, "").length >= 9 && amt > 0 && amt + fee <= (wallet?.available ?? 0);

  const submit = async () => {
    setBusy(true);
    setError("");
    const err = await onCreate({
      label: name.trim(),
      body: { amount: String(amt), currency, network: network!.code, phoneNumber: acc.replace(/\D/g, ""), metadata: { recipient: name.trim().slice(0, 200), ...(note.trim() ? { note: note.trim().slice(0, 200) } : {}) } },
    });
    setBusy(false);
    if (err) return setError(err);
    setName("");
    setAcc("");
    setAmount("");
    setNote("");
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={tr("New payout")}
      footer={
        <>
          <Button onClick={onClose}>{tr("Cancel")}</Button>
          <Button variant="primary" disabled={!valid || busy} onClick={() => void submit()}>
            {tr("Send")} {amt ? money(amt, currency) : tr("payout")}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <p className="rounded-xl border border-p-bad/30 bg-p-bad/10 px-3 py-2.5 text-sm">{error}</p>}
        <Field label={tr("Recipient name")}>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={tr("e.g. Juma Mollel")} autoFocus />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={tr("Send to")}>
            <Select value={network?.code ?? ""} onChange={(e) => setNet(e.target.value)}>
              {nets.map((n) => (
                <option key={n.code} value={n.code}>
                  {networkLabel(n)} · {n.currency}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={tr("Phone number")}>
            <Input value={acc} onChange={(e) => setAcc(e.target.value)} placeholder="255 7•• ••• •••" inputMode="tel" />
          </Field>
        </div>
        <Field label={`Amount (from ${currency} wallet)`} hint={`Available: ${money(wallet?.available ?? 0, currency)}`}>
          <Input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d,]/g, ""))} placeholder="25,000" inputMode="numeric" />
        </Field>
        <Field label={tr("Note (optional)")}>
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={tr("Shown on your records")} />
        </Field>
        {amt > 0 && (
          <dl className="space-y-1.5 rounded-xl bg-p-panel2 p-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-p-muted">{tr("Amount")}</dt>
              <dd className="tabular-nums">{money(amt, currency)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-p-muted">{tr("WisoPay fee (")}{(rate * 100).toFixed(1)}%)</dt>
              <dd className="tabular-nums">{money(zpFee, currency)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-p-muted">{tr("Network fee (est.)")}</dt>
              <dd className="tabular-nums">{money(netFee, currency)}</dd>
            </div>
            <div className="flex justify-between border-t border-p-line pt-1.5 font-medium">
              <dt>{tr("Total deducted (est.)")}</dt>
              <dd className="tabular-nums">{money(amt + fee, currency)}</dd>
            </div>
          </dl>
        )}
      </div>
    </Modal>
  );
}

/** Amounts summed per currency, each kept in its own currency. */
function sumByCurrency(rows: { currency: string; amount: number }[]) {
  const by = new Map<string, { currency: string; amount: number; count: number }>();
  for (const r of rows) {
    const cur = by.get(r.currency) ?? { currency: r.currency, amount: 0, count: 0 };
    cur.amount += r.amount;
    cur.count += 1;
    by.set(r.currency, cur);
  }
  return [...by.values()].sort((a, b) => b.amount - a.amount);
}
