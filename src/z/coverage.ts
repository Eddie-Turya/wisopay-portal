// Where WisoPay works: Tanzania, in TZS, on these mobile money networks. (Copied from ZawaPay's coverage data.)

export type ProviderId =
  | "mpesa_tz"
  | "airtel"
  | "mixx"
  | "halopesa"
  | "mtn"
  | "orange"
  | "vodacom"
  | "mpesa_ke"
  | "moov"
  | "free"
  | "zamtel";

export type Provider = { id: ProviderId; name: string; color: string };

export const PROVIDERS: Record<ProviderId, Provider> = {
  mpesa_tz: { id: "mpesa_tz", name: "M-Pesa", color: "#e60000" },
  airtel: { id: "airtel", name: "Airtel Money", color: "#e40046" },
  mixx: { id: "mixx", name: "Mixx by Yas", color: "#00a3e0" },
  halopesa: { id: "halopesa", name: "HaloPesa", color: "#f58220" },
  mtn: { id: "mtn", name: "MTN MoMo", color: "#ffcb05" },
  orange: { id: "orange", name: "Orange Money", color: "#ff7900" },
  vodacom: { id: "vodacom", name: "Vodacom M-Pesa", color: "#e60000" },
  mpesa_ke: { id: "mpesa_ke", name: "M-Pesa", color: "#4caf50" },
  moov: { id: "moov", name: "Moov Money", color: "#0066b3" },
  free: { id: "free", name: "Free Money", color: "#cd1e25" },
  zamtel: { id: "zamtel", name: "Zamtel Kwacha", color: "#2e9e48" },
};

export type Market = {
  key: string; // unique per country + currency (DRC has two)
  code: string; // ISO country code
  name: string;
  flag: string;
  currency: string;
  dial: string;
  providers: ProviderId[];
  /** Pricing tier, set from our upstream (pawaPay + operator) cost in that market */
  tier: PriceTier;
};

/**
 * standard: upstream cost up to ~3.2% · high: up to ~5% · quote: operator uses unpublished tiered fees.
 * Upstream = pawaPay 1% + operator fee (pawaPay fees page, Nov 2026).
 */
export type PriceTier = "standard" | "high" | "quote";

/** Collection fee (%) per successful payment, by plan and tier. */
export const COLLECTION_RATES: Record<Exclude<PriceTier, "quote">, { developer: number; business: number }> = {
  standard: { developer: 4.5, business: 3.5 },
  high: { developer: 6.5, business: 5.5 },
};
/** Payout fee: our % plus the operator's own payout fee, passed through at cost. */
export const PAYOUT_RATES = { developer: 2, business: 1.5 };

export const TIER_LABEL: Record<PriceTier, string> = { standard: "Standard", high: "Higher-cost", quote: "On request" };

export const MARKETS: Market[] = [
  { key: "TZ-TZS", code: "TZ", name: "Tanzania", flag: "🇹🇿", currency: "TZS", dial: "+255", providers: ["mpesa_tz", "airtel", "mixx", "halopesa"], tier: "standard" },
];

export const CURRENCY_NAMES: Record<string, string> = {
  XOF: "West African CFA franc",
  XAF: "Central African CFA franc",
  CDF: "Congolese franc",
  USD: "US dollar",
  KES: "Kenyan shilling",
  RWF: "Rwandan franc",
  SLE: "Sierra Leonean leone",
  TZS: "Tanzanian shilling",
  UGX: "Ugandan shilling",
  ZMW: "Zambian kwacha",
};

/** One entry per country (DRC merged), with all its currencies. */
export const COUNTRIES = Object.values(
  MARKETS.reduce<Record<string, Market & { currencies: string[] }>>((acc, m) => {
    acc[m.code] ??= { ...m, currencies: [] };
    acc[m.code].currencies.push(m.currency);
    return acc;
  }, {}),
);

export const CURRENCIES = [...new Set(MARKETS.map((m) => m.currency))];
export const COUNTRY_COUNT = COUNTRIES.length;
/** Operator connections, counted once per country. */
export const NETWORK_COUNT = COUNTRIES.reduce((s, c) => s + c.providers.length, 0);

export const marketOf = (code: string) => MARKETS.find((m) => m.code === code);
