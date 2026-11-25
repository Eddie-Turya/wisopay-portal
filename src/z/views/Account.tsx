import { tr } from "../i18n";

import { useState } from "react";
import Link, { useRouter, useSearchParams } from "../next";
import { BookOpen, Code2, KeyRound, Lock, Landmark, Laptop, Plus, RefreshCw, ShieldCheck, Smartphone, Trash2, Webhook } from "lucide-react";
import { date } from "../data";
import { api, ApiError } from "../api";
import { useApi, useLive } from "../live";
import { Avatar, Button, Card, CopyText, Drawer, Field, Input, Modal, PageHeader, Segmented, Select, Status, Toggle, cx, td, th, trHover, useToast } from "../ui";
import { usePortal } from "../Shell";

/* ================= Developers ================= */

const EVENTS = ["payment.completed", "payment.failed", "payment.pending", "refund.created", "refund.completed"];

type ApiKey = { id: string; name: string; keyId: string; environment: "sandbox" | "live"; last4: string; scopes: string[]; revokedAt: string | null; lastUsedAt: string | null; createdAt: string };
type Hook = { id: string; url: string; events: string[]; enabled: boolean };
type Log = { id: string; method: string; path: string; status: number; durationMs: number; at: string };

export function Developers() {
  const toast = useToast();
  const { testMode, verified } = usePortal();
  const { env } = useLive();
  const startTab = useSearchParams().get("tab");
  const [tab, setTab] = useState<"keys" | "webhooks" | "logs">(startTab === "webhooks" || startTab === "logs" ? startTab : "keys");
  const keys = useApi<{ data: ApiKey[] }>("/dashboard/api-keys");
  const hooksQ = useApi<{ data: Hook[] }>("/dashboard/webhooks", env);
  const deliveries = useApi<{ data: { status: string; url: string }[] }>(tab === "webhooks" ? "/dashboard/webhooks/deliveries?limit=100" : null, env);
  const logs = useApi<{ data: Log[] }>(tab === "logs" ? "/dashboard/api-logs" : null, env);
  const [roll, setRoll] = useState<ApiKey | null>(null);
  const [revoke, setRevoke] = useState<ApiKey | null>(null);
  const [secret, setSecret] = useState<{ title: string; value: string } | null>(null);
  const [addHook, setAddHook] = useState(false);
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>(["payment.completed", "payment.failed"]);
  const [log, setLog] = useState<Log | null>(null);
  const [busy, setBusy] = useState(false);
  const envName = testMode ? "test" : "live";
  const active = (keys.data?.data ?? []).filter((k) => !k.revokedAt && k.environment === env);
  const base = "https://api.wisopay.io";
  const run = async (f: () => Promise<void>, fail: string) => {
    setBusy(true);
    try {
      await f();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : fail, "bad");
    }
    setBusy(false);
  };
  const create = () =>
    run(async () => {
      const k = await api<{ secret: string }>("/dashboard/api-keys", { body: { name: `${env === "live" ? "Live" : "Sandbox"} key ${active.length + 1}`, environment: env } });
      setSecret({ title: tr("Your new API key"), value: k.secret });
      keys.reload();
    }, "Couldn’t create the key");
  const successRate = (h: Hook) => {
    const d = (deliveries.data?.data ?? []).filter((x) => x.url === h.url && x.status !== "PENDING");
    return d.length ? `${((d.filter((x) => x.status === "DELIVERED").length / d.length) * 100).toFixed(1)}% delivered` : "No deliveries yet";
  };

  return (
    <>
      <PageHeader
        title={tr("Developers")}
        sub={tr("Keys, webhooks and request logs for your integration.")}
        actions={
          <div className="flex gap-2">
            <Link href="/portal/docs">
              <Button>
                <BookOpen className="h-4 w-4" /> {tr("API docs")}
              </Button>
            </Link>
            <Link href="/portal/playground">
              <Button>
                <Code2 className="h-4 w-4" /> {tr("Playground")}
              </Button>
            </Link>
          </div>
        }
      />
      <div className="mb-5">
        <Segmented layoutId="dev-tab" value={tab} onChange={setTab} options={[{ value: "keys", label: tr("API keys") }, { value: "webhooks", label: tr("Webhooks") }, { value: "logs", label: tr("Logs") }]} />
      </div>

      {tab === "keys" && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_360px]">
          <Card
            title={<span className="flex items-center gap-2">{tr("Secret keys")} <span className={cx("rounded-md px-1.5 py-0.5 text-[11px] font-semibold uppercase", testMode ? "bg-p-warn/15 text-p-warn" : "bg-p-good/12 text-p-good")}>{envName}</span></span>}
            action={
              <Button size="sm" variant="primary" disabled={busy} onClick={() => void create()}>
                <Plus className="h-3.5 w-3.5" /> {tr("Create key")}
              </Button>
            }
          >
            <div className="space-y-4">
              {!verified && (
                <div className="flex items-center gap-3 rounded-xl border border-dashed border-p-line px-4 py-3 text-sm text-p-muted">
                  <Lock className="h-4 w-4 shrink-0" /> {tr("Live keys unlock once your account is verified. Sandbox keys work now.")}
                </div>
              )}
              {keys.loading && <p className="text-sm text-p-muted">{tr("Loading keys…")}</p>}
              {keys.error && <p className="text-sm text-p-bad">{keys.error}</p>}
              {!keys.loading && active.length === 0 && <p className="rounded-xl border border-p-line px-4 py-6 text-center text-sm text-p-muted">{tr("No")} {envName} {tr("keys yet. Create one to start calling the API.")}</p>}
              {active.map((k) => (
                <KeyRow
                  key={k.id}
                  label={k.name}
                  hint={`Keep this on your server. Never share it or put it in an app. ${k.lastUsedAt ? `Last used ${date(Date.parse(k.lastUsedAt))}.` : "Never used."}`}
                  value={<span className="font-mono text-[12.5px] text-p-muted">{k.keyId}.••••••••••••{k.last4}</span>}
                  actions={
                    <>
                      <Button size="sm" variant="ghost" onClick={() => setRoll(k)}>
                        <RefreshCw className="h-3.5 w-3.5" /> {tr("Roll")}
                      </Button>
                      <Button size="sm" variant="ghost" aria-label={tr("Revoke key")} onClick={() => setRevoke(k)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  }
                />
              ))}
            </div>
          </Card>
          <Card title={tr("Quick start")}>
            <pre className="overflow-x-auto rounded-xl bg-[#0c0c0e] p-4 font-mono text-[12px] leading-5 text-[#e4e4e7]">
              {`curl ${base}/v1/payments/pesa-push \\
  -H "Authorization: Bearer ${active[0]?.keyId ?? `dpay_${envName}_…`}…" \\
  -H "Content-Type: application/json" \\
  -d '{"amount":45000,"currency":"TZS",
       "phone":"255754123456",
       "reference":"ORDER-1001"}'`}
            </pre>
            <p className="mt-3 text-xs text-p-faint">{testMode ? tr("Sandbox payments complete instantly — no USSD prompt, no real money.") : tr("Live keys move real money.")}</p>
          </Card>
        </div>
      )}

      {tab === "webhooks" && (
        <Card
          title={tr("Webhook endpoints")}
          pad={false}
          action={
            <Button size="sm" variant="primary" onClick={() => setAddHook(true)}>
              <Plus className="h-3.5 w-3.5" /> {tr("Add endpoint")}
            </Button>
          }
        >
          <ul className="mt-2 divide-y divide-p-line border-t border-p-line">
            {(hooksQ.data?.data ?? []).length === 0 && <li className="px-5 py-8 text-center text-sm text-p-muted">{hooksQ.loading ? tr("Loading…") : tr("No endpoints yet. Add one to get signed events when payments change.")}</li>}
            {(hooksQ.data?.data ?? []).map((h) => (
              <li key={h.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                <Webhook className="h-5 w-5 text-p-faint" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-[13px]">{h.url}</p>
                  <p className="mt-1 flex flex-wrap gap-1">
                    {h.events.map((e) => (
                      <span key={e} className="rounded-md bg-p-panel2 px-1.5 py-0.5 font-mono text-[11px] text-p-muted">
                        {e}
                      </span>
                    ))}
                  </p>
                </div>
                <span className="text-xs text-p-muted tabular-nums">{successRate(h)}</span>
                <Status s={h.enabled ? "enabled" : "disabled"} />
                {h.enabled && (
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={tr("Disable endpoint")}
                    onClick={() =>
                      void run(async () => {
                        await api(`/dashboard/webhooks/${h.id}`, { method: "DELETE", env });
                        toast(tr("Endpoint disabled"), "info");
                        hooksQ.reload();
                      }, "Couldn’t disable the endpoint")
                    }
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {tab === "logs" && (
        <Card pad={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className={th}>{tr("Status")}</th>
                  <th className={th}>{tr("Request")}</th>
                  <th className={cx(th, "hidden sm:table-cell")}>{tr("Duration")}</th>
                  <th className={cx(th, "text-right")}>{tr("Time")}</th>
                </tr>
              </thead>
              <tbody>
                {(logs.data?.data ?? []).length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-10 text-center text-sm text-p-muted">
                      {logs.loading ? tr("Loading…") : tr("No API requests yet.")}
                    </td>
                  </tr>
                )}
                {(logs.data?.data ?? []).map((l) => (
                  <tr key={l.id + l.at} className={trHover} onClick={() => setLog(l)}>
                    <td className={td}>
                      <span className={cx("rounded-md px-1.5 py-0.5 font-mono text-xs font-semibold", l.status < 300 ? "bg-p-good/12 text-p-good" : l.status < 500 ? "bg-p-warn/14 text-p-warn" : "bg-p-bad/12 text-p-bad")}>{l.status}</span>
                    </td>
                    <td className={cx(td, "font-mono text-[13px]")}>
                      <span className="mr-2 text-p-faint">{l.method}</span>
                      {l.path}
                    </td>
                    <td className={cx(td, "hidden text-p-muted tabular-nums sm:table-cell")}>{l.durationMs} {tr("ms")}</td>
                    <td className={cx(td, "text-right text-p-muted tabular-nums")}>{date(Date.parse(l.at))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal
        open={!!roll}
        onClose={() => setRoll(null)}
        title={tr("Roll secret key?")}
        footer={
          <>
            <Button onClick={() => setRoll(null)}>{tr("Cancel")}</Button>
            <Button
              variant="danger"
              disabled={busy}
              onClick={() =>
                roll &&
                void run(async () => {
                  const k = await api<{ secret: string }>(`/dashboard/api-keys/${roll.id}/rotate`, { body: {} });
                  setRoll(null);
                  setSecret({ title: tr("Your new API key"), value: k.secret });
                  keys.reload();
                }, "Couldn’t roll the key")
              }
            >
              {tr("Roll key")}
            </Button>
          </>
        }
      >
        <p className="text-sm text-p-muted">{tr("The current key stops working immediately. Any server still using it will start getting 401 errors.")}</p>
      </Modal>

      <Modal
        open={!!revoke}
        onClose={() => setRevoke(null)}
        title={tr("Revoke this key?")}
        footer={
          <>
            <Button onClick={() => setRevoke(null)}>{tr("Cancel")}</Button>
            <Button
              variant="danger"
              disabled={busy}
              onClick={() =>
                revoke &&
                void run(async () => {
                  await api(`/dashboard/api-keys/${revoke.id}`, { method: "DELETE" });
                  setRevoke(null);
                  toast(tr("Key revoked"), "info");
                  keys.reload();
                }, "Couldn’t revoke the key")
              }
            >
              {tr("Revoke")}
            </Button>
          </>
        }
      >
        <p className="text-sm text-p-muted">{tr("Requests using")} {revoke?.keyId} {tr("will be refused straight away. This can’t be undone.")}</p>
      </Modal>

      <Modal open={!!secret} onClose={() => setSecret(null)} title={secret?.title ?? ""} footer={<Button variant="primary" onClick={() => setSecret(null)}>{tr("I’ve saved it")}</Button>}>
        <p className="mb-3 text-sm text-p-muted">{tr("Copy it now — for your security we only show it once.")}</p>
        <div className="rounded-lg bg-p-panel2 px-3 py-2">{secret && <CopyText text={secret.value} />}</div>
      </Modal>

      <Modal
        open={addHook}
        onClose={() => setAddHook(false)}
        title={tr("Add webhook endpoint")}
        footer={
          <>
            <Button onClick={() => setAddHook(false)}>{tr("Cancel")}</Button>
            <Button
              variant="primary"
              disabled={!url.startsWith("https://") || !events.length || busy}
              onClick={() =>
                void run(async () => {
                  const h = await api<{ secret: string }>("/dashboard/webhooks", { body: { url, events }, env });
                  setAddHook(false);
                  setUrl("");
                  hooksQ.reload();
                  setSecret({ title: tr("Webhook signing secret"), value: h.secret });
                }, "Couldn’t add the endpoint")
              }
            >
              {tr("Add endpoint")}
            </Button>
          </>
        }
      >
        <Field label={tr("Endpoint URL")} hint={tr("Must start with https:// and be reachable from the internet")}>
          <Input autoFocus value={url} onChange={(e) => setUrl(e.target.value)} placeholder={tr("https://example.com/webhooks/wisopay")} />
        </Field>
        <p className="mt-5 mb-2 text-[13px] font-medium">{tr("Events to send")}</p>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {EVENTS.map((e) => (
            <label key={e} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 font-mono text-[12.5px] hover:bg-p-panel2">
              <input type="checkbox" className="accent-[var(--p-accent)]" checked={events.includes(e)} onChange={(x) => setEvents((s) => (x.target.checked ? [...s, e] : s.filter((y) => y !== e)))} />
              {e}
            </label>
          ))}
        </div>
      </Modal>

      <Drawer open={!!log} onClose={() => setLog(null)} title={tr("Request")}>
        {log && (
          <div className="space-y-4">
            <p className="font-mono text-sm">
              <span className="text-p-faint">{log.method}</span> {log.path}
            </p>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-md bg-p-panel2 px-2 py-1">{tr("Status")} {log.status}</span>
              <span className="rounded-md bg-p-panel2 px-2 py-1">{log.durationMs} {tr("ms")}</span>
              <span className="rounded-md bg-p-panel2 px-2 py-1 font-mono">{log.id}</span>
            </div>
            <p className="text-xs text-p-faint">{tr("Request and response bodies aren’t stored. Quote the request id above when contacting support.")}</p>
          </div>
        )}
      </Drawer>
    </>
  );
}

function KeyRow({ label, hint, value, actions }: { label: string; hint: string; value: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-p-line p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-medium">
          <KeyRound className="h-4 w-4 text-p-faint" /> {label}
        </p>
        <div className="flex gap-1">{actions}</div>
      </div>
      <div className="mt-2 rounded-lg bg-p-panel2 px-3 py-2">{value}</div>
      <p className="mt-2 text-xs text-p-faint">{hint}</p>
    </div>
  );
}

/* ================= Settings ================= */

type Tab = "business" | "team" | "accounts" | "notifications" | "security";
const ROLES = [
  ["ADMIN", "Admin"],
  ["VIEWER", "View only"],
] as const;
const roleLabel = (r: string) => (r === "OWNER" ? "Owner" : (ROLES.find(([k]) => k === r)?.[1] ?? r));
const COUNTRY_NAME: Record<string, string> = { TZ: "Tanzania", KE: "Kenya", UG: "Uganda", RW: "Rwanda", ZM: "Zambia", CD: "DR Congo", CI: "Côte d’Ivoire", SN: "Senegal", BJ: "Benin", CM: "Cameroon", GA: "Gabon", CG: "Republic of the Congo", SL: "Sierra Leone" };

type Member = { id: string; email: string; name: string; role: string; active: boolean; mfaEnabled: boolean; lastLoginAt: string | null };
type Account = { id: string; kind: "BANK" | "MOBILE_MONEY"; label: string; isDefault: boolean; details: { masked: string; holderName: string } };
type Sess = { id: string; ip: string | null; userAgent: string | null; current: boolean; lastSeenAt: string };

const device = (ua: string | null) => {
  if (!ua) return "Unknown device";
  const os = /iPhone|iPad/.test(ua) ? "iPhone" : /Android/.test(ua) ? "Android" : /Mac OS/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows" : /Linux/.test(ua) ? "Linux" : "Device";
  const br = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Browser";
  return `${os} · ${br}`;
};

export function SettingsView() {
  const toast = useToast();
  const router = useRouter();
  const params = useSearchParams();
  const live = useLive();
  const me = live.me!;
  const canTeam = ["OWNER", "ADMIN"].includes(me.user.role);
  const tab = (params.get("tab") as Tab) || "business";
  const setTab = (t: Tab) => router.replace(`/portal/settings?tab=${t}`, { scroll: false });
  const team = useApi<{ data: Member[]; invitations: { id: string; email: string; role: string }[] }>(tab === "team" && canTeam ? "/dashboard/users" : null);
  const accounts = useApi<{ data: Account[] }>(tab === "accounts" ? "/dashboard/payout-accounts" : null);
  const sessions = useApi<{ data: Sess[] }>(tab === "security" ? "/dashboard/sessions" : null);
  const [invite, setInvite] = useState(false);
  const [inv, setInv] = useState({ email: "", role: "ADMIN" });
  const [inviteLink, setInviteLink] = useState("");
  const [addAcct, setAddAcct] = useState(false);
  const [acct, setAcct] = useState({ kind: "BANK", label: "", accountNumber: "", holderName: "" });
  const [mfa, setMfa] = useState<{ secret: string; uri: string; qr?: string } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
    const run = async (f: () => Promise<void>, fail: string) => {
    setBusy(true);
    try {
      await f();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : fail, "bad");
    }
    setBusy(false);
  };

  return (
    <>
      <PageHeader title={tr("Settings")} sub={tr("Manage your business, team and security.")} />
      <div className="mb-5 overflow-x-auto">
        <Segmented
          layoutId="set-tab"
          value={tab}
          onChange={setTab}
          options={[
            { value: "business", label: tr("Business") },
            { value: "team", label: tr("Team") },
            { value: "accounts", label: tr("Payout accounts") },
            { value: "notifications", label: tr("Notifications") },
            { value: "security", label: tr("Security") },
          ]}
        />
      </div>

      {tab === "business" && (
        <Card title={tr("Business profile")}>
          <form
            className="grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                await api("/dashboard/profile", { method: "PATCH", body: {} });
                toast(tr("Business profile saved"));
                void live.reload();
              }, "Couldn’t save the profile");
            }}
          >
            <Field label={tr("Registered business name")} hint={tr("Changed through verification")}>
              <Input value={me.merchant.legalName} disabled />
            </Field>
            <Field label={tr("Merchant slug")}>
              <Input value={(me.merchant as { slug?: string }).slug ?? ""} disabled />
            </Field>
            <Field label={tr("Country")}>
              <Input value={COUNTRY_NAME[me.merchant.country] ?? me.merchant.country} disabled />
            </Field>
            <Field label={tr("Account email")}>
              <Input value={me.user.email} disabled type="email" />
            </Field>
            <Field label={tr("Merchant ID")}>
              <Input value={(me.merchant as { shortId?: string | null }).shortId ?? me.merchant.id} disabled />
            </Field>
            <Field label={tr("Who pays the fee")} hint={tr("Applies to new payments.")}>
              <FeeBearer />
            </Field>
            <div className="sm:col-span-2">
              <div className="flex items-center gap-3 rounded-xl border border-p-line p-4">
                <ShieldCheck className={cx("h-5 w-5", me.merchant.status === "ACTIVE" ? "text-p-good" : "text-p-warn")} />
                <div className="flex-1">
                  <p className="text-sm font-medium">{me.merchant.status === "ACTIVE" ? tr("Business verified") : tr("Verification in progress")}</p>
                  <p className="text-xs text-p-muted">{live.kyc?.decidedAt ? `Decided on ${date(Date.parse(live.kyc.decidedAt), false)}` : live.kyc?.submittedAt ? `Submitted on ${date(Date.parse(live.kyc.submittedAt), false)}` : tr("Documents not submitted yet")}</p>
                </div>
                <Status s={me.merchant.status === "ACTIVE" ? "active" : "pending"} />
              </div>
            </div>
            <p className="text-xs text-p-faint sm:col-span-2">{tr("To change your registered business details, contact WisoPay support.")}</p>
          </form>
        </Card>
      )}

      {tab === "team" && (
        <Card
          title={tr("Team members")}
          pad={false}
          action={
            canTeam && (
              <Button size="sm" variant="primary" onClick={() => setInvite(true)}>
                <Plus className="h-3.5 w-3.5" /> {tr("Invite")}
              </Button>
            )
          }
        >
          <div className="overflow-x-auto pt-2">
            {!canTeam && <p className="px-5 py-8 text-center text-sm text-p-muted">{tr("Only owners and admins can manage the team.")}</p>}
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className={th}>{tr("Member")}</th>
                  <th className={th}>{tr("Role")}</th>
                  <th className={cx(th, "hidden sm:table-cell text-right")}>{tr("Last active")}</th>
                </tr>
              </thead>
              <tbody>
                {(team.data?.data ?? []).map((m) => (
                  <tr key={m.id} className="border-t border-p-line">
                    <td className={td}>
                      <span className="flex items-center gap-3">
                        <Avatar name={m.name} />
                        <span>
                          <span className="block">{m.name}{!m.active && <span className="ml-2 text-xs text-p-faint">{tr("(deactivated)")}</span>}</span>
                          <span className="block text-xs text-p-faint">{m.email}</span>
                        </span>
                      </span>
                    </td>
                    <td className={td}>
                      <span className="rounded-md bg-p-panel2 px-2 py-1 text-xs font-medium">{roleLabel(m.role)}</span>
                    </td>
                    <td className={cx(td, "hidden text-right text-p-muted sm:table-cell")}>{m.lastLoginAt ? date(Date.parse(m.lastLoginAt)) : tr("Never")}</td>
                  </tr>
                ))}
                {(team.data?.invitations ?? []).map((i) => (
                  <tr key={i.id} className="border-t border-p-line">
                    <td className={td}>
                      <span className="flex items-center gap-3">
                        <Avatar name={i.email} />
                        <span className="block text-p-muted">{i.email}</span>
                      </span>
                    </td>
                    <td className={td}>
                      <span className="rounded-md bg-p-panel2 px-2 py-1 text-xs font-medium">{roleLabel(i.role)}</span>
                    </td>
                    <td className={cx(td, "hidden text-right text-p-muted sm:table-cell")}>{tr("Invite sent")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === "accounts" && (
        <div className="grid max-w-3xl grid-cols-1 gap-3">
          {accounts.loading && <p className="text-sm text-p-muted">{tr("Loading…")}</p>}
          {accounts.data?.data.length === 0 && <p className="rounded-2xl border border-p-line p-6 text-center text-sm text-p-muted">{tr("No payout accounts yet. Add the bank account or wallet where you want settlements sent.")}</p>}
          {(accounts.data?.data ?? []).map((a) => (
            <div key={a.id} className="flex items-center gap-4 rounded-2xl border border-p-line bg-p-panel p-4">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-p-panel2">{a.kind === "BANK" ? <Landmark className="h-5 w-5 text-p-muted" /> : <Smartphone className="h-5 w-5 text-p-muted" />}</span>
              <div className="flex-1">
                <p className="text-sm font-medium">{a.label}</p>
                <p className="text-xs text-p-muted">
                  {a.details.masked} · {a.details.holderName}
                </p>
              </div>
              {a.isDefault ? (
                <span className="rounded-md bg-p-accent px-2 py-1 text-xs font-semibold text-p-accent-ink">{tr("Default")}</span>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    void run(async () => {
                      await api(`/dashboard/payout-accounts/${a.id}/default`, { body: {} });
                      toast(`${a.label} is now your default`);
                      accounts.reload();
                    }, "Couldn’t change the default")
                  }
                >
                  {tr("Make default")}
                </Button>
              )}
            </div>
          ))}
          {canTeam && (
            <Button className="justify-self-start" onClick={() => setAddAcct(true)}>
              <Plus className="h-4 w-4" /> {tr("Add payout account")}
            </Button>
          )}
        </div>
      )}

      {tab === "notifications" && (
        <Card title={tr("Email & WhatsApp alerts")}>
          <p className="max-w-2xl text-sm text-p-muted">{tr("In-app notifications (the bell above) are on. Email and WhatsApp alerts need a messaging provider, which isn’t connected yet — they’ll appear here when it is.")}</p>
        </Card>
      )}

      {tab === "security" && (
        <div className="grid max-w-3xl grid-cols-1 gap-4">
          <Card title={tr("Two-factor authentication")}>
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-p-muted">{me.user.mfaEnabled ? tr("On — we ask for a code from your authenticator app every time you sign in.") : tr("Ask for a code from your authenticator app every time you sign in.")}</p>
              {me.user.mfaEnabled ? (
                <Status s="active" />
              ) : (
                <Toggle
                  on={false}
                  onChange={() =>
                    void run(async () => {
                      const r = await api<{ secret: string; otpauthUri: string; qrCode?: string }>("/auth/mfa/setup", { body: {} });
                      setMfa({ secret: r.secret, uri: r.otpauthUri, qr: r.qrCode });
                    }, "Couldn’t start setup")
                  }
                  label={tr("Two-factor authentication")}
                />
              )}
            </div>
          </Card>
          <PasswordCard />
          <Card title={tr("Active sessions")} pad={false}>
            <ul className="mt-2 divide-y divide-p-line border-t border-p-line">
              {(sessions.data?.data ?? []).map((x) => (
                <li key={x.id} className="flex items-center gap-4 px-5 py-4">
                  <Laptop className="h-5 w-5 text-p-faint" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{device(x.userAgent)}</p>
                    <p className="text-xs text-p-muted">
                      {x.ip ?? "Unknown IP"} · {x.current ? tr("This device") : `Last active ${date(Date.parse(x.lastSeenAt))}`}
                    </p>
                  </div>
                  {x.current ? (
                    <span className="text-xs text-p-good">{tr("Current")}</span>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        void run(async () => {
                          await api(`/dashboard/sessions/${x.id}`, { method: "DELETE" });
                          toast(tr("Session signed out"), "info");
                          sessions.reload();
                        }, "Couldn’t sign out that session")
                      }
                    >
                      {tr("Sign out")}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      <Modal
        open={invite}
        onClose={() => {
          setInvite(false);
          setInviteLink("");
        }}
        title={tr("Invite a team member")}
        footer={
          inviteLink ? (
            <Button variant="primary" onClick={() => { setInvite(false); setInviteLink(""); }}>
              {tr("Done")}
            </Button>
          ) : (
            <>
              <Button onClick={() => setInvite(false)}>{tr("Cancel")}</Button>
              <Button
                variant="primary"
                disabled={!inv.email.includes("@") || busy}
                onClick={() =>
                  void run(async () => {
                    const r = await api<{ tempPassword: string }>("/dashboard/users/invite", { body: inv });
                    setInviteLink(r.tempPassword);
                    setInv({ email: "", role: "ADMIN" });
                    team.reload();
                  }, "Couldn’t send the invite")
                }
              >
                {tr("Create invite")}
              </Button>
            </>
          )
        }
      >
        {inviteLink ? (
          <div className="space-y-3">
            <p className="text-sm text-p-muted">{tr("Their account is ready. Share this temporary password with them privately; they can change it after signing in.")}</p>
            <div className="rounded-lg bg-p-panel2 px-3 py-2">
              <CopyText text={inviteLink} />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Field label={tr("Email")}>
              <Input autoFocus type="email" value={inv.email} onChange={(e) => setInv({ ...inv, email: e.target.value })} placeholder={tr("name@company.com")} />
            </Field>
            <Field label={tr("Role")} hint={tr("Admins manage everything. View-only members can see payments but not change settings.")}>
              <Select value={inv.role} onChange={(e) => setInv({ ...inv, role: e.target.value })}>
                {ROLES.filter(([k]) => k !== "ADMIN" || me.user.role === "OWNER").map(([k, l]) => (
                  <option key={k} value={k}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        )}
      </Modal>

      <Modal
        open={addAcct}
        onClose={() => setAddAcct(false)}
        title={tr("Add payout account")}
        footer={
          <>
            <Button onClick={() => setAddAcct(false)}>{tr("Cancel")}</Button>
            <Button
              variant="primary"
              disabled={busy || acct.accountNumber.replace(/\D/g, "").length < 6 || acct.holderName.trim().length < 2}
              onClick={() =>
                void run(async () => {
                  await api("/dashboard/payout-accounts", { body: { ...acct, label: acct.label.trim() || (acct.kind === "BANK" ? "Bank account" : "Mobile money") } });
                  setAddAcct(false);
                  setAcct({ kind: "BANK", label: "", accountNumber: "", holderName: "" });
                  toast(tr("Payout account added"));
                  accounts.reload();
                }, "Couldn’t add the account")
              }
            >
              {tr("Save account")}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label={tr("Account type")}>
            <Select value={acct.kind} onChange={(e) => setAcct({ ...acct, kind: e.target.value })}>
              <option value="BANK">{tr("Bank account")}</option>
              <option value="MOBILE_MONEY">{tr("Mobile money")}</option>
            </Select>
          </Field>
          <Field label={tr("Bank or wallet name")}>
            <Input value={acct.label} onChange={(e) => setAcct({ ...acct, label: e.target.value })} placeholder={acct.kind === "BANK" ? "CRDB Bank" : "M-Pesa"} />
          </Field>
          <Field label={acct.kind === "BANK" ? "Account number" : "Wallet phone number"}>
            <Input inputMode="numeric" value={acct.accountNumber} onChange={(e) => setAcct({ ...acct, accountNumber: e.target.value })} />
          </Field>
          <Field label={tr("Account holder name")} hint={tr("Must match your business or a director.")}>
            <Input value={acct.holderName} onChange={(e) => setAcct({ ...acct, holderName: e.target.value })} />
          </Field>
        </div>
      </Modal>

      <Modal
        open={!!mfa}
        onClose={() => setMfa(null)}
        title={tr("Turn on two-factor authentication")}
        footer={
          <>
            <Button onClick={() => setMfa(null)}>{tr("Cancel")}</Button>
            <Button
              variant="primary"
              disabled={code.length !== 6 || busy}
              onClick={() =>
                void run(async () => {
                  await api("/auth/mfa/enable", { body: { code } });
                  setMfa(null);
                  setCode("");
                  toast(tr("Two-factor authentication is on"));
                  void live.reload();
                }, "That code isn’t valid")
              }
            >
              {tr("Turn on")}
            </Button>
          </>
        }
      >
        {mfa && (
          <div className="space-y-4">
            <p className="text-sm text-p-muted">{tr("Scan the code or add WisoPay to Google Authenticator, 1Password or Authy with this key, then enter the 6-digit code it shows.")}</p>
            {mfa.qr && <img src={mfa.qr} alt={tr("Authenticator QR code")} className="mx-auto h-40 w-40 rounded-lg bg-white p-2" />}
            <div className="rounded-lg bg-p-panel2 px-3 py-2">
              <CopyText text={mfa.secret} />
            </div>
            <a href={mfa.uri} className="block text-xs text-p-muted underline underline-offset-2">
              {tr("Open in authenticator app")}
            </a>
            <Field label={tr("6-digit code")}>
              <Input autoFocus inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="123456" />
            </Field>
          </div>
        )}
      </Modal>
    </>
  );
}

function FeeBearer() {
  const toast = useToast();
  const q = useApi<{ fee_bearer: "merchant" | "customer"; platform_rate_percent?: number }>("/dashboard/fee");
  const set = async (v: string) => {
    try {
      await api("/dashboard/fee", { method: "PATCH", body: { fee_bearer: v } });
      toast(v === "customer" ? tr("Customers now pay the fee") : tr("You now pay the fee"));
      q.reload();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Couldn’t change the fee setting", "bad");
    }
  };
  return (
    <Select value={q.data?.fee_bearer ?? "merchant"} disabled={!q.data} onChange={(e) => void set(e.target.value)}>
      <option value="merchant">{tr("You (deducted from each payment)")}</option>
      <option value="customer">{tr("Your customer (added on top)")}</option>
    </Select>
  );
}

function PasswordCard() {
  const toast = useToast();
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      await api("/dashboard/password", { method: "PATCH", body: { current: cur, next } });
      setCur("");
      setNext("");
      toast(tr("Password changed"));
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Couldn’t change the password", "bad");
    }
    setBusy(false);
  };
  return (
    <Card title={tr("Password")}>
      <form className="grid grid-cols-1 gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); void save(); }}>
        <Field label={tr("Current password")}>
          <Input type="password" autoComplete="current-password" value={cur} onChange={(e) => setCur(e.target.value)} />
        </Field>
        <Field label={tr("New password")} hint={tr("At least 8 characters.")}>
          <Input type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
        </Field>
        <div className="sm:col-span-2">
          <Button variant="primary" type="submit" disabled={busy || !cur || next.length < 8}>{tr("Change password")}</Button>
        </div>
      </form>
    </Card>
  );
}
