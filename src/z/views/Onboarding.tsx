import { tr } from "../i18n";

import Link from "../next";
import { useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { AlertTriangle, ArrowRight, BookOpen, Check, Clock, FileText, Lock, MessageCircle, Upload } from "lucide-react";
import { useAccount, type DocState } from "../account";
import { api, ApiError, fileToBase64 } from "../api";
import { useApi, useLive } from "../live";
import { Button, Card, CopyText, Field, Input, Modal, Select, cx, useToast } from "../ui";

/** Home page shown until the account is verified. */
export function Onboarding() {
  const acct = useAccount();
  const live = useLive();
  const toast = useToast();
  const accounts = useApi<{ data: { id: string; kind: string; label: string }[] }>("/dashboard/payout-accounts");
  const keys = useApi<{ data: { keyId: string; environment: string; last4: string; revokedAt: string | null }[] }>("/dashboard/api-keys");
  const [settleOpen, setSettleOpen] = useState(false);
  const [settleType, setSettleType] = useState("Mobile money");
  const [settleAcc, setSettleAcc] = useState("");
  const [settleName, setSettleName] = useState("");
  const settlementDone = (accounts.data?.data.length ?? 0) > 0;
  const sandboxKey = keys.data?.data.find((k) => k.environment === "sandbox" && !k.revokedAt);

  const docsOk = acct.status === "approved";
  const submitted = acct.status !== "not_submitted";
  const items = [true, submitted, docsOk, settlementDone, acct.testDone, acct.verified];
  const doneCount = items.filter(Boolean).length;


  const reupload = async (file: File | undefined) => {
    if (!file) return;
    try {
      await api("/dashboard/kyc", { body: { legalName: live.me?.merchant.legalName ?? acct.info.business, address: live.me?.merchant.country ?? "", expectedMonthlyVolume: "unchanged", documents: [{ type: acct.info.docs[0]?.key ?? "PROOF_OF_ADDRESS", filename: file.name.replace(/[^\w .()-]/g, "_"), contentBase64: await fileToBase64(file) }] } });
      toast(`${file.name} uploaded — back in review`);
      void live.reload();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Upload failed", "bad");
    }
  };

  /** First submission when signup couldn't send documents: files are typed in the order the plan asks for them. */
  const uploadDocs = async (files: FileList | null) => {
    if (!files?.length) return;
    const order = acct.info.plan === "business" ? ["CERTIFICATE_OF_INCORPORATION", "TAX_CERTIFICATE", "DIRECTOR_ID"] : ["NATIONAL_ID"];
    try {
      const documents = await Promise.all([...files].slice(0, 6).map(async (f, i) => ({ type: order[i] ?? "PROOF_OF_ADDRESS", filename: f.name.replace(/[^\w .()-]/g, "_"), contentBase64: await fileToBase64(f) })));
      await api("/dashboard/kyc", { body: { legalName: live.me?.merchant.legalName ?? acct.info.business, address: live.me?.merchant.country ?? "", expectedMonthlyVolume: "not stated", documents } });
      toast(tr("Documents sent for review"));
      void live.reload();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Upload failed", "bad");
    }
  };

  const saveAccount = async () => {
    try {
      await api("/dashboard/payout-accounts", { body: { kind: settleType === "Bank account" ? "BANK" : "MOBILE_MONEY", label: settleType === "Bank account" ? "Bank account" : "Mobile money", accountNumber: settleAcc, holderName: settleName || acct.info.business } });
      setSettleOpen(false);
      toast(tr("Settlement account added"));
      accounts.reload();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Couldn’t save the account", "bad");
    }
  };

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">{tr("Welcome,")} {acct.info.first}</h1>
        <p className="mt-1 text-sm text-p-muted">{tr("Finish these steps to start accepting real payments.")}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]">
        <Card
          title={tr("Get set up")}
          action={
            <span className="text-xs text-p-muted tabular-nums">
              {doneCount} {tr("of")} {items.length} {tr("done")}
            </span>
          }
        >
          <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-p-panel2">
            <motion.div className="h-full rounded-full bg-p-accent" initial={{ width: 0 }} animate={{ width: `${(doneCount / items.length) * 100}%` }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} />
          </div>

          <ol className="space-y-3">
            <Step state="done" title={tr("Account created")} body={`Signed up as ${acct.info.email}`} />
            <Step state={submitted ? "done" : "todo"} title={tr("Documents submitted")} body={submitted ? "Sent to our compliance team" : "Upload your documents to start verification"} action={
                !submitted && (
                  <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-xl bg-p-panel px-3 text-[13px] font-medium ring-1 ring-p-line hover:bg-p-panel2">
                    <Upload className="h-3.5 w-3.5" /> {tr("Upload")}
                    <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png" className="sr-only" onChange={(e) => void uploadDocs(e.target.files)} />
                  </label>
                )
              }
            />

            <Step
              state={acct.status === "action_needed" ? "error" : docsOk ? "done" : "pending"}
              title={acct.info.plan === "business" ? "Business verification" : "Identity verification"}
              body={acct.status === "action_needed" ? "One document needs a new copy" : docsOk ? "All documents approved" : submitted ? "In review · usually within one working day" : "Waiting for your documents"}
            >
              <ul className="mt-3 divide-y divide-p-line rounded-xl border border-p-line">
                {acct.info.docs.map((d) => {
                  const st = acct.docState(d.key);
                  return (
                    <li key={d.key} className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 shrink-0 text-p-faint" />
                        <span className="flex-1 text-sm">{d.label}</span>
                        <DocBadge s={st} />
                      </div>
                      {st === "rejected" && (
                        <div className="mt-3 rounded-lg bg-p-bad/10 p-3 text-sm">
                          <p className="text-p-fg">{acct.reason ?? "This document couldn’t be verified. Please upload a clearer copy."}</p>
                          <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg bg-p-fg px-3 py-1.5 text-[13px] font-medium text-p-bg hover:opacity-90">
                            <Upload className="h-3.5 w-3.5" /> {tr("Upload new copy")}
                            <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="sr-only" onChange={(e) => void reupload(e.target.files?.[0])} />
                          </label>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Step>

            <Step
              state={settlementDone ? "done" : "todo"}
              title={tr("Add a settlement account")}
              body={settlementDone ? `${accounts.data!.data[0].label} added` : "Where we’ll send your money once you’re live"}
              action={!settlementDone && <Button size="sm" onClick={() => setSettleOpen(true)}>{tr("Add account")}</Button>}
            />
            <Step
              state={acct.testDone ? "done" : "todo"}
              title={tr("Make a test payment")}
              body={acct.testDone ? "Sandbox payment succeeded" : "Try the full flow in the sandbox — no real money moves"}
              action={
                !acct.testDone && (
                  <Link href="/portal/playground">
                    <Button size="sm">{tr("Open playground")}</Button>
                  </Link>
                )
              }
            />
            <Step state={acct.verified ? "done" : "locked"} title={tr("Go live")} body={tr("Unlocks automatically when your verification is approved — you’ll see it here.")} />
          </ol>
        </Card>

        <div className="grid grid-cols-1 content-start gap-4">
          <Card title={tr("Your sandbox keys")}>
            <p className="text-xs text-p-muted">{tr("Use these to build and test now. Live keys appear here after verification.")}</p>
            <div className="mt-3 space-y-2">
              <div className="rounded-lg bg-p-panel2 px-3 py-2">
                <p className="text-[11px] text-p-faint">{tr("Sandbox API key")}</p>
                {sandboxKey ? <CopyText text={sandboxKey.keyId} display={`${sandboxKey.keyId}…`} /> : <p className="text-[13px] text-p-muted">{tr("No key yet — create one in Developers")}</p>}
              </div>
              <div className="rounded-lg bg-p-panel2 px-3 py-2">
                <p className="text-[11px] text-p-faint">{tr("API base URL")}</p>
                <CopyText text="https://api.wisopay.io" />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-dashed border-p-line px-3 py-2 text-xs text-p-faint">
                <span className="flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5" /> {tr("Live keys")}
                </span>
                {tr("After verification")}
              </div>
            </div>
            <Link href="/portal/developers" className="mt-4 flex items-center gap-1 text-[13px] text-p-muted hover:text-p-fg">
              {tr("Open developer settings")} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Card>

          <Card title={tr("What happens next")}>
            <ol className="relative ml-1.5 space-y-4 border-l border-p-line pl-5 text-sm">
              {[
                ["We review your documents", "Our compliance team checks them, usually within one working day."],
                ["You get a notification", "The bell at the top of the portal tells you when you’re approved — or if we need anything."],
                ["Switch off test mode", "Live payments, payouts and settlements are switched on."],
              ].map(([t, d], i) => (
                <li key={t} className="relative">
                  <span className={cx("absolute top-1 -left-[26px] h-3 w-3 rounded-full ring-4 ring-p-panel", i === 0 ? "bg-p-warn" : "bg-p-line")} />
                  <p className="font-medium">{t}</p>
                  <p className="text-xs text-p-muted">{d}</p>
                </li>
              ))}
            </ol>
          </Card>

          <Card title={tr("Need help?")}>
            <div className="flex flex-col gap-2">
              <a href="https://wa.me/255744447401" target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-p-muted hover:bg-p-panel2 hover:text-p-fg">
                <MessageCircle className="h-4 w-4" /> {tr("Chat with us on WhatsApp")}
              </a>
              <Link href="/portal/support" className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-p-muted hover:bg-p-panel2 hover:text-p-fg">
                <BookOpen className="h-4 w-4" /> {tr("Help centre")}
              </Link>
            </div>
          </Card>
        </div>
      </div>

      <Modal
        open={settleOpen}
        onClose={() => setSettleOpen(false)}
        title={tr("Add settlement account")}
        footer={
          <>
            <Button onClick={() => setSettleOpen(false)}>{tr("Cancel")}</Button>
            <Button
              variant="primary"
              disabled={settleAcc.replace(/\D/g, "").length < 6}
              onClick={() => void saveAccount()}
            >
              {tr("Save account")}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label={tr("Account type")}>
            <Select value={settleType} onChange={(e) => setSettleType(e.target.value)}>
              <option>{tr("Mobile money")}</option>
              <option>{tr("Bank account")}</option>
            </Select>
          </Field>
          <Field label={settleType === "Bank account" ? "Account number" : "Wallet phone number"} hint={tr("Must be in the name of the account holder or business.")}>
            <Input autoFocus inputMode="numeric" value={settleAcc} onChange={(e) => setSettleAcc(e.target.value)} placeholder={settleType === "Bank account" ? "0150 •••• 4410" : "+255 7•• ••• •••"} />
          </Field>
          <Field label={tr("Account holder name")}>
            <Input value={settleName} onChange={(e) => setSettleName(e.target.value)} placeholder={acct.info.business} />
          </Field>
        </div>
      </Modal>
    </>
  );
}

type StepState = "done" | "pending" | "error" | "todo" | "locked";

function Step({ state, title, body, action, children }: { state: StepState; title: string; body: string; action?: ReactNode; children?: ReactNode }) {
  const icon = {
    done: <Check className="h-3.5 w-3.5" strokeWidth={3} />,
    pending: <Clock className="h-3.5 w-3.5" />,
    error: <AlertTriangle className="h-3.5 w-3.5" />,
    todo: null,
    locked: <Lock className="h-3.5 w-3.5" />,
  }[state];
  const ring = {
    done: "bg-p-accent text-p-accent-ink",
    pending: "bg-p-warn/15 text-p-warn",
    error: "bg-p-bad/15 text-p-bad",
    todo: "ring-1 ring-p-line",
    locked: "bg-p-panel2 text-p-faint",
  }[state];
  return (
    <li className={cx("rounded-2xl border p-4", state === "error" ? "border-p-bad/30" : "border-p-line", state === "locked" && "opacity-70")}>
      <div className="flex items-start gap-3">
        <span className={cx("mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full", ring)}>{icon}</span>
        <div className="min-w-0 flex-1">
          <p className={cx("text-sm font-medium", state === "done" && "text-p-muted line-through decoration-p-faint/60")}>{title}</p>
          <p className="mt-0.5 text-xs text-p-muted">{body}</p>
        </div>
        {action}
      </div>
      {children && <div className="ml-9">{children}</div>}
    </li>
  );
}

function DocBadge({ s }: { s: DocState }) {
  const m = {
    approved: ["Approved", "bg-p-good/12 text-p-good", Check],
    in_review: ["In review", "bg-p-warn/14 text-p-warn", Clock],
    rejected: ["Needs attention", "bg-p-bad/12 text-p-bad", AlertTriangle],
  } as const;
  const [label, cls, Icon] = m[s];
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", cls)}>
      <Icon className="h-3.5 w-3.5" /> {label}
    </span>
  );
}
