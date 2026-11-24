import { tr } from "./i18n";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  RotateCcw,
  X,
  XCircle,
  FileText,
  Send,
} from "lucide-react";

import { NETWORK_COLOR } from "./data";

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/* ---------- Buttons ---------- */

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
};
export function Button({ variant = "secondary", size = "md", className, ...p }: BtnProps) {
  return (
    <button
      {...p}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-xl font-medium whitespace-nowrap transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
        size === "sm" ? "h-8 px-3 text-[13px]" : "h-10 px-4 text-sm",
        variant === "primary" && "bg-p-accent text-p-accent-ink hover:brightness-95",
        variant === "secondary" && "border border-p-line bg-p-panel text-p-fg hover:bg-p-panel2",
        variant === "ghost" && "text-p-muted hover:bg-p-panel2 hover:text-p-fg",
        variant === "danger" && "bg-p-bad text-white hover:brightness-110",
        className,
      )}
    />
  );
}

/* ---------- Layout ---------- */

export function PageHeader({ title, sub, actions }: { title: string; sub?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {sub && <p className="mt-1 text-sm text-p-muted">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, action, children, className, pad = true }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string; pad?: boolean }) {
  return (
    <section className={cx("rounded-2xl border border-p-line bg-p-panel", className)}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 px-5 pt-4 pb-1">
          <h2 className="text-[15px] font-semibold">{title}</h2>
          {action}
        </header>
      )}
      <div className={pad ? "p-5" : ""}>{children}</div>
    </section>
  );
}

export function Stat({ label, value, sub, delta }: { label: string; value: string; sub?: string; delta?: number }) {
  return (
    <div className="rounded-2xl border border-p-line bg-p-panel p-5">
      <p className="text-[13px] text-p-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      <div className="mt-1 flex items-center gap-2 text-xs">
        {delta !== undefined && (
          <span className={cx("rounded-md px-1.5 py-0.5 font-medium", delta >= 0 ? "bg-p-good/12 text-p-good" : "bg-p-bad/12 text-p-bad")}>
            {delta >= 0 ? "↑" : "↓"} {Math.abs(delta).toFixed(1)}%
          </span>
        )}
        {sub && <span className="text-p-faint">{sub}</span>}
      </div>
    </div>
  );
}

/* ---------- Segmented control ---------- */

export function Segmented<T extends string>({ value, onChange, options, layoutId }: { value: T; onChange: (v: T) => void; options: { value: T; label: string; count?: number }[]; layoutId: string }) {
  return (
    <div className="inline-flex rounded-xl border border-p-line bg-p-panel2 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cx("relative rounded-[10px] px-3 py-1.5 text-[13px] font-medium transition", value === o.value ? "text-p-fg" : "text-p-muted hover:text-p-fg")}
        >
          {value === o.value && (
            <motion.span layoutId={layoutId} className="absolute inset-0 rounded-[10px] border border-p-line bg-p-panel shadow-sm" transition={{ type: "spring", stiffness: 500, damping: 38 }} />
          )}
          <span className="relative">
            {o.label}
            {o.count !== undefined && <span className="ml-1.5 text-p-faint tabular-nums">{o.count}</span>}
          </span>
        </button>
      ))}
    </div>
  );
}

/* ---------- Status badge (icon + label, never colour alone) ---------- */

const STATUS: Record<string, { label: string; tone: "good" | "warn" | "bad" | "info" | "muted"; icon: typeof Check }> = {
  succeeded: { label: tr("Succeeded"), tone: "good", icon: CheckCircle2 },
  paid: { label: tr("Paid"), tone: "good", icon: CheckCircle2 },
  enabled: { label: tr("Enabled"), tone: "good", icon: CheckCircle2 },
  active: { label: tr("Active"), tone: "good", icon: CheckCircle2 },
  pending: { label: tr("Pending"), tone: "warn", icon: Clock },
  processing: { label: tr("Processing"), tone: "warn", icon: Clock },
  in_transit: { label: tr("In transit"), tone: "info", icon: Send },
  scheduled: { label: tr("Requested"), tone: "warn", icon: Clock },
  open: { label: tr("Open"), tone: "info", icon: FileText },
  failed: { label: tr("Failed"), tone: "bad", icon: XCircle },
  rejected: { label: tr("Rejected"), tone: "bad", icon: XCircle },
  cancelled: { label: tr("Cancelled"), tone: "muted", icon: XCircle },
  overdue: { label: tr("Overdue"), tone: "bad", icon: AlertTriangle },
  refunded: { label: tr("Refunded"), tone: "muted", icon: RotateCcw },
  draft: { label: tr("Draft"), tone: "muted", icon: FileText },
  disabled: { label: tr("Disabled"), tone: "muted", icon: XCircle },
};
const TONE = {
  good: "bg-p-good/12 text-p-good",
  warn: "bg-p-warn/14 text-p-warn",
  bad: "bg-p-bad/12 text-p-bad",
  info: "bg-p-info/12 text-p-info",
  muted: "bg-p-panel2 text-p-muted",
};
export function Status({ s }: { s: string }) {
  const m = STATUS[s] ?? { label: s, tone: "muted" as const, icon: Clock };
  const Icon = m.icon;
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", TONE[m.tone])}>
      <Icon className="h-3.5 w-3.5" />
      {m.label}
    </span>
  );
}

/* ---------- Form ---------- */

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-p-faint">{hint}</span>}
    </label>
  );
}
const inputCls =
  "h-10 w-full rounded-xl border border-p-line bg-p-panel px-3 text-sm text-p-fg outline-none transition placeholder:text-p-faint focus:border-p-fg/40 focus:ring-4 focus:ring-p-accent/25";
export function Input(p: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...p} className={cx(inputCls, p.className)} />;
}
export function Select(p: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...p} className={cx(inputCls, "appearance-none bg-[length:16px] bg-[right_10px_center] bg-no-repeat pr-8", p.className)} style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%238c8c96' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }} />;
}
export function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={cx("relative h-6 w-10 shrink-0 rounded-full transition", on ? "bg-p-accent" : "bg-p-line")}
    >
      <motion.span layout transition={{ type: "spring", stiffness: 600, damping: 35 }} className={cx("absolute top-0.5 h-5 w-5 rounded-full shadow", on ? "right-0.5 bg-p-accent-ink" : "left-0.5 bg-white")} />
    </button>
  );
}

/* ---------- Overlays ---------- */

function useEsc(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
}

export function Modal({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEsc(open, onClose);
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80] grid place-items-center p-4">
          <motion.div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className={cx("relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-2xl border border-p-line bg-p-panel shadow-2xl", wide ? "max-w-3xl" : "max-w-md")}
          >
            <div className="flex items-center justify-between border-b border-p-line px-5 py-4">
              <h3 className="font-semibold">{title}</h3>
              <button aria-label={tr("Close")} onClick={onClose} className="rounded-lg p-1 text-p-muted hover:bg-p-panel2">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="overflow-y-auto p-5">{children}</div>
            {footer && <div className="flex justify-end gap-2 border-t border-p-line px-5 py-4">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function Drawer({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode }) {
  useEsc(open, onClose);
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70]">
          <motion.div className="absolute inset-0 bg-black/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 40 }}
            className="absolute inset-y-0 right-0 flex w-full max-w-lg flex-col border-l border-p-line bg-p-panel shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-p-line px-5 py-4">
              <div className="font-semibold">{title}</div>
              <button aria-label={tr("Close")} onClick={onClose} className="rounded-lg p-1 text-p-muted hover:bg-p-panel2">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">{children}</div>
            {footer && <div className="flex gap-2 border-t border-p-line px-5 py-4">{footer}</div>}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}

/* ---------- Toasts ---------- */

type Toast = { id: number; text: string; tone: "good" | "bad" | "info" };
const ToastCtx = createContext<(text: string, tone?: Toast["tone"]) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((text: string, tone: Toast["tone"] = "good") => {
    const id = Math.random();
    setItems((x) => [...x, { id, text, tone }]);
    setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), 3200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed right-4 bottom-4 z-[100] flex flex-col gap-2">
        <AnimatePresence>
          {items.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40 }}
              className="pointer-events-auto flex items-center gap-2.5 rounded-xl border border-p-line bg-p-panel px-4 py-3 text-sm shadow-xl"
            >
              {t.tone === "bad" ? <XCircle className="h-4 w-4 text-p-bad" /> : <CheckCircle2 className={cx("h-4 w-4", t.tone === "good" ? "text-p-good" : "text-p-info")} />}
              {t.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}

/* ---------- Misc ---------- */

export function CopyText({ text, display, mono = true }: { text: string; display?: string; mono?: boolean }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard?.writeText(text).catch(() => {});
        setOk(true);
        setTimeout(() => setOk(false), 1200);
      }}
      className={cx("group inline-flex max-w-full items-center gap-1.5 rounded-md text-left hover:text-p-fg", mono && "font-mono text-[12.5px]")}
      title={tr("Copy")}
    >
      <span className="truncate">{display ?? text}</span>
      {ok ? <Check className="h-3.5 w-3.5 shrink-0 text-p-good" /> : <Copy className="h-3.5 w-3.5 shrink-0 opacity-0 transition group-hover:opacity-60" />}
    </button>
  );
}

export function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const clean = name.replace(/^Rider: /, "");
  const initials = /[a-z]/i.test(clean) ? clean.split(" ").map((p) => p[0]).slice(0, 2).join("") : clean.replace(/\D/g, "").slice(-2);
  return (
    <span className="grid shrink-0 place-items-center rounded-full bg-p-panel2 text-[11px] font-semibold text-p-muted ring-1 ring-p-line" style={{ width: size, height: size }}>
      {initials}
    </span>
  );
}

export function NetworkDot({ name }: { name: string }) {
  return <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: NETWORK_COLOR[name] ?? "#8c8c96" }} />;
}

export function Pagination({ page, pages, total, onPage }: { page: number; pages: number; total: number; onPage: (p: number) => void }) {
  return (
    <div className="flex items-center justify-between border-t border-p-line px-5 py-3 text-[13px] text-p-muted">
      <span className="tabular-nums">{total} {tr("results")}</span>
      <div className="flex items-center gap-2">
        <span className="tabular-nums">
          {tr("Page")} {pages ? page + 1 : 0} {tr("of")} {pages}
        </span>
        <Button size="sm" aria-label={tr("Previous page")} disabled={page === 0} onClick={() => onPage(page - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button size="sm" aria-label={tr("Next page")} disabled={page >= pages - 1} onClick={() => onPage(page + 1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function Empty({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-p-panel2 text-p-faint">
        <FileText className="h-5 w-5" />
      </div>
      <p className="mt-4 font-medium">{title}</p>
      <p className="mt-1 max-w-xs text-sm text-p-muted">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export const th = "px-5 py-2.5 text-left text-xs font-medium text-p-faint whitespace-nowrap";
export const td = "px-5 py-3 whitespace-nowrap";
export const trHover = "cursor-pointer border-t border-p-line transition hover:bg-p-panel2/60";

const CURRENCY_SHOWN = 4;

/** One card per measure, each currency on its own row, two per row on wide screens. Top few shown; the rest behind a toggle. */
export function CurrencyCard({ title, sub, empty, rows }: { title: string; sub: string; empty: string; rows: { currency: string; value: string; detail: string }[] }) {
  const [more, setMore] = useState(false);
  const shown = more ? rows : rows.slice(0, CURRENCY_SHOWN);
  return (
    <Card title={title} action={<span className="text-xs text-p-muted">{rows.length} {rows.length === 1 ? tr("currency") : tr("currencies")}</span>}>
      <p className="mb-4 text-xs text-p-faint">{sub}</p>
      {rows.length === 0 && <p className="py-6 text-sm text-p-muted">{empty}</p>}
      <ul className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
        {shown.map((r) => (
          <li key={r.currency} className="flex items-center justify-between gap-4 border-b border-p-line py-3 sm:[&:nth-last-child(-n+2)]:border-b-0">
            <span>
              <span className="block text-sm font-medium">{r.currency}</span>
              <span className="block text-xs text-p-muted">{r.detail}</span>
            </span>
            <span className="text-right text-lg font-semibold tabular-nums">{r.value}</span>
          </li>
        ))}
      </ul>
      {rows.length > CURRENCY_SHOWN && (
        <button onClick={() => setMore((m) => !m)} className="mt-3 text-sm font-medium text-p-fg underline-offset-4 hover:underline">
          {more ? tr("Show fewer") : `+${rows.length - CURRENCY_SHOWN} more currencies`}
        </button>
      )}
    </Card>
  );
}
