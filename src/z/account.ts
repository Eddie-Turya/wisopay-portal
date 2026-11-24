import { useSyncExternalStore } from "react";
import { useLive } from "./live";

// Browser preferences (theme, test-mode switch, dismissed banners) and the merchant's account state,
// which comes from the API (merchant status + KYC review).

const EVT = "zp-pref";

function read(key: string, fallback: string) {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}
export function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {}
  window.dispatchEvent(new Event(EVT));
}

/** A string preference that survives reloads and syncs across components and tabs. */
export function usePref(key: string, fallback: string) {
  const subscribe = (cb: () => void) => {
    window.addEventListener("storage", cb);
    window.addEventListener(EVT, cb);
    return () => {
      window.removeEventListener("storage", cb);
      window.removeEventListener(EVT, cb);
    };
  };
  const value = useSyncExternalStore(subscribe, () => read(key, fallback), () => fallback);
  return [value, (v: string) => write(key, v)] as const;
}

/* ---------- Account status ---------- */

export type AccountStatus = "not_submitted" | "in_review" | "action_needed" | "approved" | "suspended" | "rejected";
export type DocState = "in_review" | "approved" | "rejected";

export type AccountInfo = {
  first: string;
  email: string;
  plan: "developer" | "business";
  business: string;
  docs: { key: string; label: string }[];
  markets: string[];
};

const DOC_LABEL: Record<string, string> = {
  CERTIFICATE_OF_INCORPORATION: "Certificate of incorporation",
  TAX_CERTIFICATE: "Tax certificate (TIN)",
  DIRECTOR_ID: "Director’s ID",
  NATIONAL_ID: "ID document",
  PROOF_OF_ADDRESS: "Proof of address",
};

export function useAccount() {
  const { me, kyc, payments, env } = useLive();
  const [ackFor, setAck] = usePref("zp-live-ack", "");

  const m = me?.merchant;
  const status: AccountStatus = !m
    ? "in_review"
    : m.status === "ACTIVE"
      ? "approved"
      : m.status === "SUSPENDED"
        ? "suspended"
        : m.status === "REJECTED"
          ? "rejected"
          : m.status === "ACTION_REQUIRED" || kyc?.status === "CHANGES_REQUESTED"
            ? "action_needed"
            : !kyc || kyc.status === "NOT_SUBMITTED"
              ? "not_submitted"
              : "in_review";

  const info: AccountInfo = {
    first: me?.user.name.split(" ")[0] ?? "",
    email: me?.user.email ?? "",
    plan: m?.plan === "DEVELOPER" ? "developer" : "business",
    business: m?.tradingName || m?.legalName || "",
    docs: (kyc?.documents ?? []).map((d) => ({ key: d.type, label: DOC_LABEL[d.type] ?? d.filename })),
    markets: m ? [m.country] : [],
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- views pass the document key
  const docState = (_key?: string): DocState => (status === "approved" ? "approved" : status === "action_needed" || status === "rejected" ? "rejected" : "in_review");
  const verified = status === "approved" && !!m?.liveEnabled;

  return {
    status,
    info,
    verified,
    reason: kyc?.reason ?? null,
    docState,
    /** One-time "you're live" banner after approval (remembered per merchant in this browser) */
    celebrate: verified && !!m && ackFor !== m.id,
    dismissCelebrate: () => m && setAck(m.id),
    /** A sandbox test payment has succeeded */
    testDone: env === "sandbox" && payments.some((p) => p.status === "succeeded"),
  };
}

/** True once running in the browser (false during server render and hydration). */
export function useHydrated() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}
