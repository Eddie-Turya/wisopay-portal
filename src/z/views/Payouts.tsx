import { tr } from "../i18n";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "../next";
import { Download, Plus, Search, Upload, FileSpreadsheet, Smartphone, Landmark, AlertTriangle } from "lucide-react";
import { date, download, money, toCSV, type PayoutStatus } from "../data";
import { useLive } from "../live";
import { api, ApiError } from "../api";
import { BANKS, bankName } from "../banks";
import { Avatar, Button, Card, Field, Input, Modal, PageHeader, Pagination, Segmented, Select, Stat, Status, cx, td, th, trHover, useToast } from "../ui";

const PER = 12;

type Options = {
  live: { available: boolean; fee: number | null; enabled: boolean; perPayoutMax: number; dailyMax: number; usedToday: number; balance: number };
  sandbox: { available: boolean; fee: number };
  banks: { code: string; name: string }[];
};

function usePayoutOptions(reloadKey: unknown) {
  const [o, setO] = useState<Options | null>(null);
  useEffect(() => {
    api<Options>("/dashboard/payouts/options").then(setO).catch(() => setO(null));
  }, [reloadKey]);
  return o;
}

export function Payouts() {
  const toast = useToast();
  const router = useRouter();
  const params = useSearchParams();
  const live = useLive();
  const isLive = live.env === "live";
  const rows = live.payouts;
  const [status, setStatus] = useState<"all" | PayoutStatus>("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [bulk, setBulk] = useState(false);
  const [tick, setTick] = useState(0);
  const opts = usePayoutOptions(`${live.env}-${tick}`);
  const newOpen = params.get("new") === "1";
  const setNewOpen = (v: boolean) => router.replace(v ? "/portal/payouts?new=1" : "/portal/payouts", { scroll: false });

  const mode = isLive ? opts?.live : opts?.sandbox;
  const canSend = !!mode?.available;
  const fee = isLive ? opts?.live.fee ?? 0 : 0;

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter((p) => (status === "all" || p.status === status) && (!s || (p.recipient + p.account + p.id + (p.raw.metadata?.destination ?? "")).toLowerCase().includes(s)));
  }, [rows, status, q]);
  const pages = Math.ceil(filtered.length / PER);
  const month = rows.filter((p) => p.createdAt > live.now - 30 * 86_400_000 && p.status === "paid");
  const sentMonth = month.reduce((a, p) => a + p.amount, 0);

  const refresh = () => {
    setTick((x) => x + 1);
    void live.reload();
    setTimeout(() => void live.reload(), 4000);
    setTimeout(() => void live.reload(), 12000);
  };

  return (
    <>
      <PageHeader
        title={tr("Payouts")}
        sub={tr("Send money from your balance to mobile wallets and bank accounts.")}
        actions={
          <>
            <Button onClick={() => setBulk(true)} disabled={!canSend}>
              <Upload className="h-4 w-4" /> {tr("Bulk payout")}
            </Button>
            <Button variant="primary" onClick={() => setNewOpen(true)} disabled={!canSend}>
              <Plus className="h-4 w-4" /> {tr("New payout")}
            </Button>
          </>
        }
      />

      {opts && isLive && !opts.live.available && (
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-p-warn/30 bg-p-warn/10 px-4 py-3.5 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-p-warn" />
          <div>
            <p className="font-medium text-p-fg">{tr("Live payouts aren’t switched on for your account yet")}</p>
            <p className="mt-0.5 text-p-muted">{tr("WisoPay turns them on for verified businesses. Ask us at support@wisopay.io. Meanwhile, switch to test mode to try payouts in the sandbox.")}</p>
          </div>
        </div>
      )}

      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label={isLive ? tr("Available balance") : tr("Sandbox")} value={isLive ? money(opts?.live.balance ?? 0, "TZS") : tr("No real money")} sub={isLive ? tr("what you can pay out") : tr("payouts are simulated")} />
        <Stat label={tr("Paid out · 30 days")} value={money(sentMonth, "TZS")} sub={`${month.length} payouts`} />
        <Stat label={tr("Fee per payout")} value={isLive ? (opts?.live.fee != null ? money(opts.live.fee, "TZS") : "—") : money(0, "TZS")} sub={tr("taken from your balance")} />
        <Stat label={tr("Left today")} value={isLive && opts?.live.enabled ? money(Math.max(0, opts.live.dailyMax - opts.live.usedToday), "TZS") : "—"} sub={isLive && opts?.live.enabled ? `of ${money(opts.live.dailyMax, "TZS")} daily limit` : tr("daily limit")} />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Segmented
          layoutId="po-status"
          value={status}
          onChange={(v) => { setStatus(v); setPage(0); }}
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
          <Button aria-label={tr("Export CSV")} onClick={() => download("wisopay-payouts.csv", toCSV(filtered.map((p) => ({ id: p.id, recipient: p.recipient, destination: p.raw.metadata?.destination ?? p.account, amount: p.amount, fee: p.fee, status: p.status, reference: p.raw.merchantReference ?? "", provider_reference: p.raw.metadata?.providerReference ?? "", date: new Date(p.createdAt).toISOString() }))))}>
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
                    {rows.length ? tr("No payouts match.") : tr("No payouts yet. Send money to any mobile wallet or bank account from your balance.")}
                  </td>
                </tr>
              )}
              {filtered.slice(page * PER, page * PER + PER).map((p) => (
                <tr key={p.id} className={trHover}>
                  <td className={td}>
                    <span className="flex items-center gap-3">
                      <Avatar name={p.recipient} />
                      <span>
                        {p.recipient}
                        {p.raw.metadata?.source === "bulk" && <span className="ml-1.5 rounded bg-p-panel2 px-1.5 py-px text-[11px] text-p-muted">{tr("bulk")}</span>}
                        {p.raw.failure?.message && <span className="block text-xs text-p-bad">{p.raw.failure.message}</span>}
                      </span>
                    </span>
                  </td>
                  <td className={cx(td, "font-medium tabular-nums")}>
                    {money(p.amount, p.currency)}
                    {p.fee > 0 && <span className="block text-xs font-normal text-p-faint">+ {money(p.fee, p.currency)} fee</span>}
                  </td>
                  <td className={td}><Status s={p.status} /></td>
                  <td className={cx(td, "hidden text-p-muted md:table-cell")}>
                    {p.raw.metadata?.destination ?? `${p.network} · ${p.account}`}
                    {p.raw.metadata?.providerReference && <span className="block font-mono text-[11px] text-p-faint">{p.raw.metadata.providerReference}</span>}
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

      {opts && (
        <NewPayout
          open={newOpen && canSend}
          onClose={() => setNewOpen(false)}
          fee={fee}
          balance={isLive ? opts.live.balance : Infinity}
          max={isLive ? opts.live.perPayoutMax : Infinity}
          onDone={(label, amount) => { setNewOpen(false); toast(`Payout of ${money(amount, "TZS")} to ${label} is on its way`); refresh(); }}
        />
      )}
      {opts && <BulkPayout open={bulk && canSend} onClose={() => setBulk(false)} fee={fee} balance={isLive ? opts.live.balance : Infinity} onDone={(n) => { setBulk(false); toast(`${n} payouts are being sent`); refresh(); }} />}
    </>
  );
}

/* ---------- One payout ---------- */

function NewPayout({ open, onClose, fee, balance, max, onDone }: { open: boolean; onClose: () => void; fee: number; balance: number; max: number; onDone: (label: string, amount: number) => void }) {
  const { env } = useLive();
  const [channel, setChannel] = useState<"mobile" | "bank">("mobile");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [bank, setBank] = useState("");
  const [account, setAccount] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const key = useRef(crypto.randomUUID());
  const amt = Number(amount.replace(/,/g, "")) || 0;
  const total = amt + fee;
  const dest = channel === "mobile" ? phone.replace(/\D/g, "").length >= 9 : !!bank && account.replace(/[\s-]/g, "").length >= 6;
  const tooMuch = total > balance;
  const valid = name.trim().length >= 2 && dest && amt >= 500 && amt <= max && !tooMuch;

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      await api("/dashboard/payouts", {
        body: { channel, amount: String(amt), recipientName: name.trim(), phoneNumber: phone, bankCode: bank, accountNumber: account, narration: note.trim() || undefined, idempotencyKey: key.current },
        env,
      });
      onDone(name.trim(), amt);
      key.current = crypto.randomUUID();
      setName(""); setPhone(""); setAccount(""); setAmount(""); setNote("");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Payout failed");
    }
    setBusy(false);
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
            {busy ? tr("Sending…") : `${tr("Send")} ${amt ? money(amt, "TZS") : tr("payout")}`}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <p className="rounded-xl border border-p-bad/30 bg-p-bad/10 px-3 py-2.5 text-sm">{error}</p>}
        <div className="grid grid-cols-2 gap-2">
          {([["mobile", "Mobile money", Smartphone], ["bank", "Bank account", Landmark]] as const).map(([v, label, Icon]) => (
            <button key={v} type="button" onClick={() => setChannel(v)} className={cx("flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition", channel === v ? "border-p-accent bg-p-accent/10 text-p-fg" : "border-p-line text-p-muted hover:bg-p-panel2")}>
              <Icon className="h-4 w-4" /> {tr(label)}
            </button>
          ))}
        </div>
        <Field label={tr("Recipient name")}>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={tr("e.g. Juma Mollel")} autoFocus />
        </Field>
        {channel === "mobile" ? (
          <Field label={tr("Phone number")} hint={tr("M-Pesa, Airtel, Mixx or HaloPesa")}>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0712 345 678" inputMode="tel" />
          </Field>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Field label={tr("Bank")}>
              <Select value={bank} onChange={(e) => setBank(e.target.value)}>
                <option value="">{tr("Choose bank")}</option>
                {BANKS.map((b) => <option key={b.code} value={b.code}>{b.name}</option>)}
              </Select>
            </Field>
            <Field label={tr("Account number")}>
              <Input value={account} onChange={(e) => setAccount(e.target.value)} inputMode="numeric" />
            </Field>
          </div>
        )}
        <Field label={tr("Amount (TZS)")} hint={Number.isFinite(balance) ? `Available: ${money(balance, "TZS")}` : tr("Sandbox: no real money")}>
          <Input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d,]/g, ""))} placeholder="25,000" inputMode="numeric" />
        </Field>
        <Field label={tr("Note (optional)")}>
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={tr("Shown on your records and to the provider")} />
        </Field>
        {amt > 0 && (
          <dl className="space-y-1.5 rounded-xl bg-p-panel2 p-4 text-sm">
            <div className="flex justify-between"><dt className="text-p-muted">{tr("Recipient gets")}</dt><dd className="tabular-nums">{money(amt, "TZS")}</dd></div>
            <div className="flex justify-between"><dt className="text-p-muted">{tr("WisoPay fee")}</dt><dd className="tabular-nums">{money(fee, "TZS")}</dd></div>
            <div className="flex justify-between border-t border-p-line pt-1.5 font-medium"><dt>{tr("Taken from your balance")}</dt><dd className="tabular-nums">{money(total, "TZS")}</dd></div>
            {tooMuch && <p className="pt-1 text-xs text-p-bad">{tr("That’s more than your available balance.")}</p>}
            {amt > max && <p className="pt-1 text-xs text-p-bad">{`The most per payout is ${money(max, "TZS")}.`}</p>}
            {amt > 0 && amt < 500 && <p className="pt-1 text-xs text-p-bad">{tr("The minimum is TZS 500.")}</p>}
          </dl>
        )}
      </div>
    </Modal>
  );
}

/* ---------- Bulk payouts ---------- */

type Row = { recipient_name: string; channel: "mobile" | "bank"; phone_number?: string; bank_code?: string; account_number?: string; amount_minor: number; narration?: string; problem?: string };

const TEMPLATE = "name,phone_or_account,bank_code,amount,note\nJuma Mollel,0688410902,,25000,Rider earnings\nAsha Supplies Ltd,0150123456789,CRDB,150000,Invoice 1043\n";

/** Splits a CSV line, allowing quoted fields with commas. */
function splitCsv(line: string): string[] {
  const out: string[] = [];
  let cur = "", quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { if (quoted && line[i + 1] === '"') { cur += '"'; i++; } else quoted = !quoted; }
    else if (ch === "," && !quoted) { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out.map((x) => x.trim());
}

function parseCsv(text: string): Row[] {
  const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim());
  if (!lines.length) return [];
  const head = splitCsv(lines[0]).map((h) => h.toLowerCase());
  const col = (names: string[]) => head.findIndex((h) => names.includes(h));
  const iName = col(["name", "recipient", "recipient_name"]), iTo = col(["phone_or_account", "phone", "account", "phone_number", "account_number"]), iBank = col(["bank_code", "bank"]), iAmt = col(["amount", "amount_minor"]), iNote = col(["note", "narration", "reference"]);
  return lines.slice(1).map((l) => {
    const c = splitCsv(l);
    const bankRaw = (iBank >= 0 ? c[iBank] : "").toUpperCase();
    const bank = BANKS.find((b) => b.code === bankRaw || b.name.toUpperCase() === bankRaw)?.code ?? bankRaw;
    const to = (iTo >= 0 ? c[iTo] : "").replace(/[\s-]/g, "");
    const amount = Number(String(iAmt >= 0 ? c[iAmt] : "").replace(/[,\s]/g, ""));
    const row: Row = bank
      ? { recipient_name: c[iName] ?? "", channel: "bank", bank_code: bank, account_number: to, amount_minor: amount, narration: iNote >= 0 ? c[iNote] : undefined }
      : { recipient_name: c[iName] ?? "", channel: "mobile", phone_number: to, amount_minor: amount, narration: iNote >= 0 ? c[iNote] : undefined };
    if (!row.recipient_name || row.recipient_name.length < 2) row.problem = "Missing name";
    else if (!Number.isInteger(amount) || amount < 500) row.problem = "Amount must be a whole number, at least 500";
    else if (bank && !BANKS.some((b) => b.code === bank)) row.problem = `Unknown bank "${bankRaw}"`;
    else if (!bank && to.replace(/\D/g, "").length < 9) row.problem = "Phone number looks wrong";
    else if (bank && to.length < 6) row.problem = "Account number looks wrong";
    return row;
  });
}

function BulkPayout({ open, onClose, fee, balance, onDone }: { open: boolean; onClose: () => void; fee: number; balance: number; onDone: (n: number) => void }) {
  const { env } = useLive();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [serverRows, setServerRows] = useState<{ row: number; error: string }[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => { setRows(null); setFileName(""); setError(""); setServerRows([]); };
  const read = async (f: File | undefined) => {
    if (!f) return;
    reset();
    setFileName(f.name);
    const parsed = parseCsv(await f.text());
    if (!parsed.length) setError("The file has no rows under the header.");
    else if (parsed.length > 500) setError("Up to 500 payouts per file.");
    setRows(parsed);
  };
  const problems = (rows ?? []).filter((r) => r.problem).length;
  const total = (rows ?? []).reduce((a, r) => a + (r.amount_minor || 0), 0);
  const withFees = total + fee * (rows?.length ?? 0);
  const ok = !!rows?.length && rows.length <= 500 && !problems && withFees <= balance;

  const send = async () => {
    setBusy(true);
    setError("");
    setServerRows([]);
    try {
      const r = await api<{ count: number }>("/dashboard/payouts/bulk", { body: { rows: rows!.map(({ problem: _p, ...x }) => x) }, env });
      onDone(r.count);
      reset();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn’t send the file");
      const details = (e as ApiError)?.details as { rows?: { row: number; error: string }[] } | undefined;
      if (Array.isArray(details?.rows)) setServerRows(details!.rows);
    }
    setBusy(false);
  };

  return (
    <Modal
      open={open}
      onClose={() => { reset(); onClose(); }}
      title={tr("Bulk payout")}
      footer={
        <>
          <Button onClick={() => download("wisopay-bulk-payouts.csv", TEMPLATE)}><Download className="h-4 w-4" /> {tr("Template")}</Button>
          <Button variant="primary" disabled={!ok || busy} onClick={() => void send()}>
            {busy ? tr("Sending…") : rows?.length ? `Send ${rows.length} payouts · ${money(withFees, "TZS")}` : tr("Send")}
          </Button>
        </>
      }
    >
      <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => void read(e.target.files?.[0])} />
      {!rows ? (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); void read(e.dataTransfer.files?.[0]); }}
          className="grid w-full place-items-center rounded-2xl border-2 border-dashed border-p-line bg-p-panel2 px-6 py-10 text-center hover:border-p-accent/50"
        >
          <FileSpreadsheet className="h-8 w-8 text-p-faint" />
          <span className="mt-3 text-sm font-medium">{tr("Choose or drop a CSV file")}</span>
          <span className="mt-1 text-xs text-p-muted">{tr("Up to 500 payouts. Every row is checked before anything is sent.")}</span>
        </button>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-p-fg">{fileName}</span>
            <button className="text-xs text-p-muted underline" onClick={() => fileRef.current?.click()}>{tr("Choose another file")}</button>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <div className="rounded-xl bg-p-panel2 py-2"><div className="font-semibold tabular-nums">{rows.length}</div><div className="text-xs text-p-muted">{tr("payouts")}</div></div>
            <div className="rounded-xl bg-p-panel2 py-2"><div className="font-semibold tabular-nums">{money(total, "TZS")}</div><div className="text-xs text-p-muted">{tr("to recipients")}</div></div>
            <div className="rounded-xl bg-p-panel2 py-2"><div className="font-semibold tabular-nums">{money(withFees, "TZS")}</div><div className="text-xs text-p-muted">{tr("with fees")}</div></div>
          </div>
          {problems > 0 && <p className="text-sm text-p-bad">{`${problems} row${problems === 1 ? "" : "s"} need fixing before you can send.`}</p>}
          {withFees > balance && <p className="text-sm text-p-bad">{tr("This is more than your available balance.")}</p>}
          <div className="max-h-64 overflow-auto rounded-xl border border-p-line">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-p-panel"><tr><th className={th}>#</th><th className={th}>{tr("Recipient")}</th><th className={th}>{tr("To")}</th><th className={cx(th, "text-right")}>{tr("Amount")}</th></tr></thead>
              <tbody>
                {rows.map((r, i) => {
                  const bad = r.problem || serverRows.find((s) => s.row === i + 1)?.error;
                  return (
                    <tr key={i} className={bad ? "bg-p-bad/5" : ""}>
                      <td className={cx(td, "text-p-faint")}>{i + 1}</td>
                      <td className={td}>{r.recipient_name}{bad && <span className="block text-p-bad">{bad}</span>}</td>
                      <td className={cx(td, "text-p-muted")}>{r.channel === "bank" ? `${bankName(r.bank_code)} · ${r.account_number}` : r.phone_number}</td>
                      <td className={cx(td, "text-right tabular-nums")}>{Number.isFinite(r.amount_minor) ? money(r.amount_minor, "TZS") : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {error && <p className="mt-3 rounded-xl border border-p-bad/30 bg-p-bad/10 px-3 py-2.5 text-sm">{error}</p>}
      <p className="mt-4 text-xs text-p-faint">{tr("Columns: name, phone_or_account, bank_code (blank for mobile money), amount, note")}</p>
    </Modal>
  );
}
