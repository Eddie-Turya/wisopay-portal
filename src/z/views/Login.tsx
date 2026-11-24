import { tr } from "../i18n";

import Link from "../next";
import { useRouter } from "../next";
import { useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, Eye, EyeOff, Loader2 } from "lucide-react";
import { Field, Input } from "../ui";
import { api, ApiError, setSession } from "../api";

type Tokens = { accessToken: string; refreshToken: string };

export function Login() {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const [mfaToken, setMfaToken] = useState("");
  const [code, setCode] = useState("");

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      if (mfaToken) {
        setSession(await api<Tokens>("/auth/mfa/verify", { body: { mfaToken, code }, auth: false }));
        router.push("/portal");
        return;
      }
      const r = await api<Tokens & { mfaRequired: boolean; mfaToken?: string }>("/auth/login", { body: { email, password: pw }, auth: false });
      if (r.mfaRequired && r.mfaToken) {
        setMfaToken(r.mfaToken);
        setBusy(false);
        return;
      }
      setSession(r);
      router.push("/portal");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn’t sign in. Try again.");
      if (e instanceof ApiError && e.message.toLowerCase().includes("expired")) setMfaToken("");
      setBusy(false);
    }
  };

  return (
    <div className="portal dark grid min-h-screen grid-cols-1 bg-p-bg text-p-fg lg:grid-cols-2" data-theme="dark">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Link href="https://wisopay.io" className="flex items-center gap-2.5">
          <img src="/logo.png" alt="" className="h-8 w-8 rounded-[10px]" />
          <span className="text-[17px] font-semibold">{tr("wisopay")}</span>
        </Link>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mx-auto my-auto w-full max-w-sm py-12">
          <h1 className="text-3xl font-semibold tracking-tight">{tr("Welcome back")}</h1>
          <p className="mt-2 text-sm text-p-muted">{tr("Sign in to your merchant account.")}</p>

          <form
            className="mt-8 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            {error && <p className="rounded-xl border border-p-bad/30 bg-p-bad/10 px-3 py-2.5 text-sm text-p-fg">{error}</p>}
            {mfaToken ? (
              <Field label={tr("Two-factor code")} hint={tr("Enter the 6-digit code from your authenticator app.")}>
                <Input autoFocus inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="123456" required />
              </Field>
            ) : (
            <>
            <Field label={tr("Email")}>
              <Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={tr("you@business.com")} required />
            </Field>
            <Field label={tr("Password")}>
              <div className="relative">
                <Input type={show ? "text" : "password"} autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="••••••••" required className="pr-10" />
                <button type="button" aria-label={show ? "Hide password" : "Show password"} onClick={() => setShow((s) => !s)} className="absolute top-1/2 right-3 -translate-y-1/2 text-p-faint hover:text-p-fg">
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-p-muted">
                <input type="checkbox" className="accent-[var(--p-accent)]" defaultChecked /> {tr("Keep me signed in")}
              </label>
              <a href="https://wa.me/255744447401" target="_blank" rel="noreferrer" className="text-p-muted hover:text-p-fg">
                {tr("Forgot password?")}
              </a>
            </div>
            </>
            )}
            <button disabled={busy} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-p-accent font-medium text-p-accent-ink transition hover:brightness-95 disabled:opacity-70">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <>{mfaToken ? tr("Verify") : tr("Sign in")} <ArrowRight className="h-4 w-4" /></>}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-p-muted">
            {tr("New to WisoPay?")}{" "}
            <Link href="/portal/signup" className="font-medium text-p-fg underline-offset-4 hover:underline">
              {tr("Create an account")}
            </Link>
          </p>
        </motion.div>

        <p className="text-xs text-p-faint">{tr("© 2026 WisoPay · Privacy · Terms")}</p>
      </div>

      {/* Visual side */}
      <div className="relative hidden overflow-hidden border-l border-p-line bg-p-panel lg:block">
        <div className="absolute -top-40 -right-40 h-[520px] w-[520px] rounded-full bg-p-series/30 blur-[120px]" />
        <div className="absolute -bottom-32 -left-20 h-[420px] w-[420px] rounded-full bg-p-accent/15 blur-[120px]" />
        <div className="relative flex h-full flex-col justify-center px-14">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.6 }} className="max-w-md rounded-2xl border border-p-line bg-p-bg/70 p-6 backdrop-blur">
            <p className="text-xs text-p-muted">{tr("Available balance")}</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight">TZS 8,420,500</p>
            <div className="mt-5 flex h-20 items-end gap-1.5">
              {[30, 42, 38, 55, 48, 62, 58, 70, 66, 82, 76, 94].map((h, i) => (
                <motion.span key={i} className="flex-1 rounded-t-[4px] bg-p-series" initial={{ height: 0 }} animate={{ height: `${h}%` }} transition={{ delay: 0.4 + i * 0.04, duration: 0.5 }} />
              ))}
            </div>
            <div className="mt-5 space-y-2">
              {[
                ["Amina Mushi", "M-Pesa", "TZS 25,000"],
                ["Brian Otieno", "Airtel Money", "TZS 12,500"],
              ].map(([n, m, a]) => (
                <div key={n} className="flex items-center justify-between rounded-xl bg-p-panel2 px-3 py-2.5 text-sm">
                  <span>
                    {n} <span className="text-xs text-p-faint">· {m}</span>
                  </span>
                  <span className="font-medium tabular-nums">{a}</span>
                </div>
              ))}
            </div>
          </motion.div>
          <h2 className="mt-10 max-w-md text-2xl font-semibold tracking-tight">{tr("All your payments and settlements in one place.")}</h2>
          <p className="mt-3 max-w-md text-sm text-p-muted">{tr("M-Pesa, Airtel Money, Mixx by Yas and HaloPesa — USSD push, payment links and invoices in one dashboard.")}</p>
        </div>
      </div>
    </div>
  );
}
