import { tr } from "./i18n";


import Link from "./next";
import { usePathname, useRouter } from "./next";
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  BarChart3,
  Bell,
  Code2,
  FileText,
  HelpCircle,
  Landmark,
  LayoutGrid,
  Link2,
  LogOut,
  Menu,
  Moon,
  Search,
  Settings,
  Sun,
  Users,
  Wallet,
  X,
  CornerDownLeft,
  Lock,
  Clock,
  AlertTriangle,
  PartyPopper,
  Smartphone,
  Gavel,
  Split,
  BookOpen,
} from "lucide-react";
import { useEnv } from "../context/EnvContext";
import { useTheme } from "../context/ThemeContext";
import { useIdleTimeout } from "../hooks/useIdleTimeout";
import { useAccount, useHydrated } from "./account";
import { ToastProvider, cx, Toggle, Button } from "./ui";
import { api, getSession, setSession } from "./api";
import { SupportChat } from "./SupportChat";
import { LiveProvider, useLive } from "./live";

const NAV = [
  {
    group: "Overview",
    items: [
      { href: "/portal", label: tr("Home"), icon: LayoutGrid },
      { href: "/portal/analytics", label: tr("Analytics"), icon: BarChart3 },
    ],
  },
  {
    group: "Money",
    items: [
      { href: "/portal/payments", label: tr("Payments"), icon: ArrowDownToLine },
      { href: "/portal/payouts", label: tr("Payouts"), icon: ArrowUpFromLine },
      { href: "/portal/balances", label: tr("Balances"), icon: Wallet },
      { href: "/portal/settlements", label: tr("Settlements"), icon: Landmark },
      { href: "/portal/statements", label: tr("Statements"), icon: FileText },
    ],
  },
  {
    group: "Get paid",
    items: [
      { href: "/portal/collect", label: tr("Collect (USSD, card)"), icon: Smartphone },
      { href: "/portal/disputes", label: tr("Disputes"), icon: Gavel },
      { href: "/portal/payment-links", label: tr("Payment links"), icon: Link2 },
      { href: "/portal/invoices", label: tr("Invoices"), icon: FileText },
      { href: "/portal/bill-splits", label: tr("Bill splits"), icon: Split },
      { href: "/portal/customers", label: tr("Customers"), icon: Users },
    ],
  },
  {
    group: "Account",
    items: [
      { href: "/portal/developers", label: tr("Developers"), icon: Code2 },
      { href: "/portal/docs", label: tr("API docs"), icon: BookOpen },
      { href: "/portal/settings", label: tr("Settings"), icon: Settings },
    ],
  },
];
const ALL = NAV.flatMap((g) => g.items);

const PortalCtx = createContext({ testMode: true, business: "", verified: false });
export const usePortal = () => useContext(PortalCtx);

/** Signed-in gate + live data. Pages render only with a session; otherwise go to the login page. */
export function Shell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const { mode } = useEnv();
  const signedIn = hydrated && !!getSession();
  useEffect(() => {
    if (hydrated && !getSession()) router.replace("/portal/login");
    const h = () => !getSession() && router.replace("/portal/login");
    window.addEventListener("zp-session", h);
    return () => window.removeEventListener("zp-session", h);
  }, [hydrated, router]);
  if (!signedIn) return <div className="min-h-screen bg-p-bg" />;
  return (
    <LiveProvider wantLive={mode === "live"}>
      <ShellInner>{children}</ShellInner>
    </LiveProvider>
  );
}

function ShellInner({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const live = useLive();
  const { theme, toggle: toggleTheme } = useTheme();
  const { setMode } = useEnv();
  const setTest = (v: string) => setMode(v === "1" ? "sandbox" : "live");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [palette, setPalette] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);
  const acct = useAccount();
  // Live mode is only available once the account is verified
  const testMode = live.env === "sandbox";
  const role = live.me?.user.role ?? "";
  const business = { name: acct.info.business || "Your business", sub: `${acct.info.plan === "business" ? "Business" : "Developer"} account`, color: "from-[#34d399] to-[#0a8f64]" };
  const signOut = async () => {
    await api("/auth/logout", { body: {} }).catch(() => {});
    setSession(null);
    router.replace("/portal/login");
  };
  // Sign out after a stretch of inactivity (kept from the WisoPay portal)
  useIdleTimeout(() => void signOut(), () => {});

  // Close the mobile menu when the route changes
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setMobileOpen(false);
  }

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((p) => !p);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const current = ALL.find((i) => (i.href === "/portal" ? pathname === "/portal" : pathname.startsWith(i.href)));

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-4 pt-5 pb-4">
        <img src="/logo.png" alt="" className="h-8 w-8 rounded-[10px]" />
        <div className="leading-tight">
          <p className="text-[15px] font-semibold">{tr("wisopay")}</p>
          <p className="text-[11px] text-p-faint">{tr("Merchant portal")}</p>
        </div>
      </div>

      <BusinessSwitcher business={business} />

      <nav className="mt-4 flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        {NAV.map((g) => (
          <div key={g.group}>
            <p className="mb-1.5 px-2 text-[11px] font-medium tracking-wide text-p-faint uppercase">{g.group}</p>
            <ul className="space-y-0.5">
              {g.items.map((it) => {
                const active = current?.href === it.href;
                return (
                  <li key={it.href}>
                    <Link
                      href={it.href}
                      className={cx(
                        "relative flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-[13.5px] font-medium transition",
                        active ? "text-p-accent-ink" : "text-p-muted hover:bg-p-panel2 hover:text-p-fg",
                      )}
                    >
                      {active && <motion.span layoutId="nav-active" className="absolute inset-0 rounded-xl bg-p-accent" transition={{ type: "spring", stiffness: 500, damping: 40 }} />}
                      <it.icon className="relative h-4 w-4" />
                      <span className="relative">{it.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="space-y-3 border-t border-p-line p-3">
        <div className="flex items-center justify-between rounded-xl px-2.5 py-1.5" title={acct.verified ? undefined : "Live mode unlocks once your account is verified"}>
          <span className="flex items-center gap-1.5 text-[13px] font-medium">
            {tr("Test mode")} {!acct.verified && <Lock className="h-3.5 w-3.5 text-p-faint" />}
          </span>
          {acct.verified ? <Toggle on={testMode} onChange={(v) => setTest(v ? "1" : "0")} label={tr("Test mode")} /> : <span className="rounded-full bg-p-warn/15 px-2 py-0.5 text-[11px] font-medium text-p-warn">{tr("Locked on")}</span>}
        </div>
        <div className="flex items-center gap-2.5 rounded-xl px-2.5 py-1.5">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-p-panel2 text-xs font-semibold ring-1 ring-p-line">{(live.me?.user.name ?? "?").split(" ").map((x) => x[0]).slice(0, 2).join("").toUpperCase()}</span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-[13px] font-medium">{live.me?.user.name ?? ""}</p>
            <p className="truncate text-[11px] text-p-faint">{role ? role[0] + role.slice(1).toLowerCase() : ""}</p>
          </div>
          <button onClick={signOut} aria-label={tr("Sign out")} className="rounded-lg p-1.5 text-p-faint hover:bg-p-panel2 hover:text-p-fg">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="portal min-h-screen bg-p-bg text-p-fg" data-theme={theme}>
      <PortalCtx.Provider value={{ testMode, business: business.name, verified: acct.verified }}>
        <ToastProvider>
          {testMode && (
            <div className="sticky top-0 z-50 flex h-7 items-center justify-center gap-2 bg-p-warn text-xs font-semibold text-black">
              {acct.verified ? tr("TEST MODE · You’re viewing test data. No real money moves.") : tr("SANDBOX · Live payments switch on after verification. No real money moves.")}
            </div>
          )}

          {/* Desktop sidebar */}
          <aside className={cx("fixed left-0 z-40 hidden w-64 border-r border-p-line bg-p-panel lg:block", testMode ? "top-7 bottom-0" : "inset-y-0")}>{sidebar}</aside>

          {/* Mobile sidebar */}
          <AnimatePresence>
            {mobileOpen && (
              <div className="fixed inset-0 z-[60] lg:hidden">
                <motion.div className="absolute inset-0 bg-black/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileOpen(false)} />
                <motion.aside initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "spring", stiffness: 400, damping: 40 }} className="absolute inset-y-0 left-0 w-72 border-r border-p-line bg-p-panel">
                  <button aria-label={tr("Close menu")} onClick={() => setMobileOpen(false)} className="absolute top-5 right-3 rounded-lg p-1.5 text-p-muted hover:bg-p-panel2">
                    <X className="h-4 w-4" />
                  </button>
                  {sidebar}
                </motion.aside>
              </div>
            )}
          </AnimatePresence>

          <div className="lg:pl-64">
            {/* Top bar */}
            <header className={cx("sticky z-30 flex h-16 items-center gap-3 border-b border-p-line bg-p-bg/80 px-4 backdrop-blur-xl sm:px-6", testMode ? "top-7" : "top-0")}>
              <button aria-label={tr("Open menu")} onClick={() => setMobileOpen(true)} className="rounded-lg p-2 text-p-muted hover:bg-p-panel2 lg:hidden">
                <Menu className="h-5 w-5" />
              </button>
              <div className="hidden items-center gap-2 text-sm sm:flex">
                <span className="text-p-faint">{business.name}</span>
                <span className="text-p-faint">/</span>
                <span className="font-medium">{current?.label ?? "Portal"}</span>
              </div>

              <button
                onClick={() => setPalette(true)}
                className="ml-auto flex h-9 w-full max-w-xs items-center gap-2 rounded-xl border border-p-line bg-p-panel px-3 text-sm text-p-faint transition hover:border-p-faint/50 sm:ml-6 md:ml-auto"
              >
                <Search className="h-4 w-4" />
                <span className="flex-1 text-left">{tr("Search or jump to…")}</span>
                <kbd className="hidden rounded-md border border-p-line px-1.5 py-0.5 font-mono text-[10px] sm:inline">{tr("⌘K")}</kbd>
              </button>

              <Notifications />
              <button
                aria-label={tr("Toggle theme")}
                onClick={toggleTheme}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-p-muted transition hover:bg-p-panel2 hover:text-p-fg"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <a href="/support" aria-label={tr("Help")} className="hidden h-9 w-9 shrink-0 place-items-center rounded-xl text-p-muted transition hover:bg-p-panel2 hover:text-p-fg sm:grid">
                <HelpCircle className="h-4 w-4" />
              </a>
            </header>

            <motion.main key={pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8">
              {/* Page content depends on browser-stored account state, so render it client-side only */}
              {!live.ready ? (
                <div className="h-[60vh] animate-pulse rounded-2xl bg-p-panel" />
              ) : live.error && !live.me ? (
                <div className="grid h-[50vh] place-items-center rounded-2xl border border-p-line bg-p-panel text-center">
                  <div>
                    <p className="text-sm font-semibold">{tr("We couldn’t load your account")}</p>
                    <p className="mt-1 text-sm text-p-muted">{live.error}</p>
                    <Button className="mt-4" onClick={() => void live.reload()}>
                      {tr("Try again")}
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {live.me?.announcement && <div className="mb-4 rounded-2xl border border-p-line bg-p-panel px-5 py-3 text-sm">📣 {live.me.announcement}</div>}
                  <StatusBanner />
                  <div className="contents">{children}</div>
                </>
              )}
            </motion.main>
            <SupportChat />
          </div>

          <CommandPalette open={palette} onClose={() => setPalette(false)} />
        </ToastProvider>
      </PortalCtx.Provider>
    </div>
  );
}

/* ---------- Business switcher ---------- */

function BusinessSwitcher({ business: b }: { business: { name: string; sub: string; color: string } }) {
  return (
    <div className="px-3">
      <div className="flex w-full items-center gap-2.5 rounded-xl border border-p-line bg-p-panel2 px-2.5 py-2 text-left">
        <span className={cx("grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br text-xs font-bold text-white", b.color)}>{b.name[0]}</span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-[13px] font-semibold">{b.name}</span>
          <span className="block truncate text-[11px] text-p-faint">{b.sub}</span>
        </span>
      </div>
    </div>
  );
}

/* ---------- Notifications ---------- */

function Notifications() {
  const { notifications, reload } = useLive();
  const [open, setOpen] = useState(false);
  const [read, setRead] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false));
  const unread = read ? 0 : notifications.filter((n) => n.unread).length;
  const router = useRouter();
  const markAll = async () => {
    setRead(true);
    await api("/dashboard/notifications/read-all", { body: {} }).catch(() => {});
    await reload();
    setRead(false);
  };
  const openNote = async (n: { id: string; unread: boolean; link?: string | null }) => {
    setOpen(false);
    if (n.unread) await api(`/dashboard/notifications/${n.id}/read`, { body: {} }).catch(() => {});
    if (n.link) router.push(`/portal${n.link === "/" ? "" : n.link}`);
    void reload();
  };
  return (
    <div ref={ref} className="relative">
      <button aria-label={tr("Notifications")} onClick={() => setOpen((o) => !o)} className="relative grid h-9 w-9 place-items-center rounded-xl text-p-muted transition hover:bg-p-panel2 hover:text-p-fg">
        <Bell className="h-4 w-4" />
        {unread > 0 && <span className="absolute top-1.5 right-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-p-accent px-1 text-[10px] font-bold text-p-accent-ink">{unread}</span>}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6 }} className="absolute right-0 top-full z-50 mt-2 w-80 rounded-2xl border border-p-line bg-p-panel shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3">
              <p className="text-sm font-semibold">{tr("Notifications")}</p>
              <button onClick={() => void markAll()} className="text-xs text-p-muted hover:text-p-fg">
                {tr("Mark all read")}
              </button>
            </div>
            <ul className="max-h-80 overflow-y-auto border-t border-p-line">
              {notifications.length === 0 && <li className="px-4 py-8 text-center text-xs text-p-muted">{tr("You’re all caught up.")}</li>}
              {notifications.map((n) => (
                <li key={n.id} className="border-b border-p-line last:border-0">
                  <button onClick={() => void openNote(n)} className="flex w-full gap-3 px-4 py-3 text-left transition hover:bg-p-panel2">
                    <span className={cx("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.unread && !read ? "bg-p-accent" : "bg-transparent")} />
                    <span className="min-w-0">
                      <span className={cx("block text-[13px]", n.unread && !read ? "font-semibold" : "font-medium")}>{n.title}</span>
                      <span className="line-clamp-2 block text-xs text-p-muted">{n.body}</span>
                      <span className="mt-0.5 block text-[11px] text-p-faint">{n.time}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------- Command palette ---------- */

const ACTIONS = [
  { label: tr("Collect a payment"), href: "/portal/collect", icon: Smartphone },
  { label: tr("Create a payment link"), href: "/portal/payment-links", icon: Link2 },
  { label: tr("Create an invoice"), href: "/portal/invoices/new", icon: FileText },
  { label: tr("Test in the playground"), href: "/portal/playground", icon: Code2 },
  { label: tr("Get help"), href: "/portal/support", icon: HelpCircle },
  { label: tr("View API keys"), href: "/portal/developers", icon: Code2 },
  { label: tr("Read the API docs"), href: "/portal/docs", icon: BookOpen },
  { label: tr("Invite a team member"), href: "/portal/settings?tab=team", icon: Users },
];

function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const items = useMemo(() => {
    const all = [...ALL.map((i) => ({ ...i, kind: "Pages" })), ...ACTIONS.map((a) => ({ ...a, kind: "Actions" }))];
    const s = q.trim().toLowerCase();
    return s ? all.filter((i) => i.label.toLowerCase().includes(s)) : all;
  }, [q]);

  const close = () => {
    setQ("");
    setSel(0);
    onClose();
  };
  const go = (href: string) => {
    router.push(href);
    close();
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[90] flex items-start justify-center p-4 pt-[12vh]">
          <motion.div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close} />
          <motion.div initial={{ opacity: 0, scale: 0.97, y: -8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.18 }} className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-p-line bg-p-panel shadow-2xl">
            <div className="flex items-center gap-3 border-b border-p-line px-4">
              <Search className="h-4 w-4 text-p-faint" />
              <input
                autoFocus
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setSel(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") close();
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setSel((s) => Math.min(items.length - 1, s + 1));
                  }
                  if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setSel((s) => Math.max(0, s - 1));
                  }
                  if (e.key === "Enter" && items[sel]) go(items[sel].href);
                }}
                placeholder={tr("Search pages and actions…")}
                className="h-14 flex-1 bg-transparent text-[15px] outline-none placeholder:text-p-faint"
              />
              <kbd className="rounded-md border border-p-line px-1.5 py-0.5 font-mono text-[10px] text-p-faint">{tr("ESC")}</kbd>
            </div>
            <ul className="max-h-[50vh] overflow-y-auto p-2">
              {items.length === 0 && <li className="px-3 py-8 text-center text-sm text-p-muted">{tr("No results for “")}{q}”</li>}
              {items.map((it, i) => (
                <li key={it.kind + it.label}>
                  {(i === 0 || items[i - 1].kind !== it.kind) && <p className="px-3 pt-2 pb-1 text-[11px] font-medium tracking-wide text-p-faint uppercase">{it.kind}</p>}
                  <button
                    onMouseEnter={() => setSel(i)}
                    onClick={() => go(it.href)}
                    className={cx("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm", sel === i ? "bg-p-panel2 text-p-fg" : "text-p-muted")}
                  >
                    <it.icon className="h-4 w-4" />
                    <span className="flex-1">{it.label}</span>
                    {sel === i && <CornerDownLeft className="h-3.5 w-3.5 text-p-faint" />}
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function useClickOutside(ref: React.RefObject<HTMLElement | null>, cb: () => void) {
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) cb();
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [ref, cb]);
}

/* ---------- Account status banner ---------- */

function StatusBanner() {
  const acct = useAccount();
  if (acct.status === "approved" && !acct.celebrate) return null;
  const views = {
    not_submitted: { tone: "border-p-warn/30 bg-p-warn/10", icon: <Clock className="h-5 w-5 text-p-warn" />, title: tr("Verify your business to go live"), body: tr("Upload your documents to start accepting real payments. The sandbox works now.") },
    in_review: { tone: "border-p-warn/30 bg-p-warn/10", icon: <Clock className="h-5 w-5 text-p-warn" />, title: tr("Your account is under review"), body: tr("We’re checking your documents — usually within one working day. You can build and test in the sandbox meanwhile.") },
    action_needed: { tone: "border-p-bad/30 bg-p-bad/10", icon: <AlertTriangle className="h-5 w-5 text-p-bad" />, title: tr("Action needed on your account"), body: acct.reason ?? "One of your documents couldn’t be verified. Upload a new copy to continue your review." },
    suspended: { tone: "border-p-bad/30 bg-p-bad/10", icon: <AlertTriangle className="h-5 w-5 text-p-bad" />, title: tr("Your account is suspended"), body: tr("Payments are paused. Contact support to resolve this.") },
    rejected: { tone: "border-p-bad/30 bg-p-bad/10", icon: <AlertTriangle className="h-5 w-5 text-p-bad" />, title: tr("Verification wasn’t approved"), body: acct.reason ?? "Contact support for details." },
    approved: { tone: "border-p-good/30 bg-p-good/10", icon: <PartyPopper className="h-5 w-5 text-p-good" />, title: tr("You’re live! 🎉"), body: tr("Your account is verified. Switch off test mode to start accepting real payments.") },
  } as const;
  const view = views[acct.status];
  return (
    <div className={cx("mb-6 flex flex-wrap items-center gap-4 rounded-2xl border px-5 py-4", view.tone)}>
      {view.icon}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{view.title}</p>
        <p className="mt-0.5 text-sm text-p-muted">{view.body}</p>
      </div>
      {acct.status === "approved" ? (
        <button onClick={acct.dismissCelebrate} className="rounded-xl px-3 py-2 text-sm font-medium text-p-muted hover:bg-p-panel2 hover:text-p-fg">
          {tr("Dismiss")}
        </button>
      ) : (
        <Link href="/portal" className="rounded-xl bg-p-panel px-4 py-2 text-sm font-medium ring-1 ring-p-line hover:bg-p-panel2">
          {acct.status === "action_needed" || acct.status === "not_submitted" ? tr("Fix now") : tr("View status")}
        </Link>
      )}
    </div>
  );
}
