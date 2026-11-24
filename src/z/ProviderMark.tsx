import { PROVIDERS, type ProviderId } from "./coverage";

// Text badge for a mobile money provider: a brand-coloured mark + the name.
// (Swap in licensed logo files here once you have them.)
export function ProviderMark({ id, compact }: { id: ProviderId; compact?: boolean }) {
  const p = PROVIDERS[id];
  const initials = p.name
    .replace(/^Vodacom /, "")
    .split(/[\s-]+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const dark = p.id === "mtn"; // yellow needs dark text
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-current/10 py-1 pr-2.5 pl-1 text-xs font-medium whitespace-nowrap">
      {LOGO_FILES[id] ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={LOGO_FILES[id]} alt="" aria-hidden className="h-5 w-5 shrink-0 rounded-md bg-white object-contain p-0.5" />
      ) : (
        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md text-[9px] font-bold" style={{ background: p.color, color: dark ? "#00405e" : "#fff" }} aria-hidden>
          {initials}
        </span>
      )}
      {!compact && p.name}
    </span>
  );
}

// Real logo files in /public/providers (from Wikimedia Commons). Providers without a file show a coloured icon.
export const LOGO_FILES: Partial<Record<ProviderId, string>> = {
  mpesa_tz: "/providers/mpesa.svg",
  mpesa_ke: "/providers/mpesa.svg",
  vodacom: "/providers/mpesa.svg",
  airtel: "/providers/airtel.svg",
  mtn: "/providers/mtn.svg",
  orange: "/providers/orange.svg",
  mixx: "/providers/mixx.svg",
};

/** Logo-only tile (no name). Falls back to a brand-coloured icon if no logo file is set. */
export function ProviderLogo({ id, size = 56 }: { id: ProviderId; size?: number }) {
  const p = PROVIDERS[id];
  const src = LOGO_FILES[id];
  const initials = p.name.replace(/^Vodacom /, "").split(/[\s-]+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <span
      title={p.name}
      className="grid place-items-center overflow-hidden rounded-2xl bg-white shadow-[0_12px_30px_-12px_rgba(12,12,14,0.3)] ring-1 ring-black/5"
      style={{ width: size, height: size }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={p.name} className="h-[84%] w-[84%] object-contain" />
      ) : (
        <span className="grid h-[72%] w-[72%] place-items-center rounded-xl text-sm font-bold" style={{ background: p.color, color: p.id === "mtn" ? "#00405e" : "#fff" }}>
          {initials}
          <span className="sr-only">{p.name}</span>
        </span>
      )}
    </span>
  );
}
