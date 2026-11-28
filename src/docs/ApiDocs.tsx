/**
 * WisoPay API docs. One self-contained component (with apidocs.css) shared, as identical copies, by
 * the merchant portal (/docs inside the app) and the public site (wisopay.io/docs). Edit both copies
 * together. Everything here describes the API as it actually behaves; keep it that way.
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Check, Copy } from 'lucide-react'
import './apidocs.css'

const BASE = 'https://api.wisopay.io'

/* ── Code samples ──────────────────────────────────────────────────────────── */

type Lang = 'curl' | 'node' | 'python'
const LANGS: { id: Lang; label: string }[] = [
  { id: 'curl', label: 'cURL' },
  { id: 'node', label: 'Node.js' },
  { id: 'python', label: 'Python' },
]
type Sample = Partial<Record<Lang, string>> & { json?: string; text?: string }

function useLang(): [Lang, (l: Lang) => void] {
  const read = (): Lang => {
    try { return (localStorage.getItem('wd-lang') as Lang) || 'curl' } catch { return 'curl' }
  }
  const [lang, setLang] = useState<Lang>(read)
  useEffect(() => {
    const on = () => setLang(read())
    window.addEventListener('wd-lang', on)
    return () => window.removeEventListener('wd-lang', on)
  }, [])
  return [lang, (l) => {
    try { localStorage.setItem('wd-lang', l) } catch { /* not remembered in private mode */ }
    window.dispatchEvent(new Event('wd-lang'))
  }]
}

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false)
  return (
    <button
      className="wd-copy"
      aria-label="Copy code"
      onClick={() => {
        void navigator.clipboard?.writeText(text).then(() => { setDone(true); setTimeout(() => setDone(false), 1500) })
      }}
    >
      {done ? <Check size={14} /> : <Copy size={14} />}
    </button>
  )
}

function Code({ sample, title }: { sample: Sample; title?: string }) {
  const [lang, setLang] = useLang()
  const langs = LANGS.filter((l) => sample[l.id])
  const fixed = sample.json ?? sample.text
  const shown = fixed ?? sample[langs.some((l) => l.id === lang) ? lang : langs[0]?.id ?? 'curl'] ?? ''
  return (
    <div className="wd-codeblock">
      <div className="wd-codehead">
        {fixed != null ? (
          <span className="wd-codetitle">{title ?? (sample.json ? 'JSON' : '')}</span>
        ) : (
          <div className="wd-tabs" role="tablist">
            {langs.map((l) => (
              <button key={l.id} role="tab" aria-selected={lang === l.id || (!langs.some((x) => x.id === lang) && l === langs[0])} onClick={() => setLang(l.id)}>
                {l.label}
              </button>
            ))}
          </div>
        )}
        <CopyButton text={shown} />
      </div>
      <pre><code>{shown}</code></pre>
    </div>
  )
}

/* ── Small pieces ──────────────────────────────────────────────────────────── */

function C({ children }: { children: ReactNode }) {
  return <code className="wd-ic">{children}</code>
}

type Field = { name: string; type: string; required?: boolean; desc: ReactNode }
function Fields({ title, fields }: { title: string; fields: Field[] }) {
  return (
    <div className="wd-fields">
      <h4>{title}</h4>
      <dl>
        {fields.map((f) => (
          <div key={f.name} className="wd-field">
            <dt>
              <code>{f.name}</code>
              <span className="wd-type">{f.type}</span>
              {f.required ? <span className="wd-req">required</span> : null}
            </dt>
            <dd>{f.desc}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function Endpoint({ method, path }: { method: 'GET' | 'POST'; path: string }) {
  return (
    <div className="wd-endpoint">
      <span className={`wd-method wd-method--${method.toLowerCase()}`}>{method}</span>
      <code>{path}</code>
    </div>
  )
}

function Note({ kind = 'info', children }: { kind?: 'info' | 'warn'; children: ReactNode }) {
  return <div className={`wd-note wd-note--${kind}`}>{children}</div>
}

/** One section: prose on the left, code on the right (stacked on narrow screens). */
function Section({ id, title, children, aside }: { id: string; title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section id={id} className="wd-section" data-section>
      <div className="wd-prose">
        <h2><a href={`#${id}`}>{title}</a></h2>
        {children}
      </div>
      <div className="wd-aside">{aside}</div>
    </section>
  )
}

/* ── Samples ───────────────────────────────────────────────────────────────── */

const S = {
  auth: {
    curl: `curl ${BASE}/v1/payments \\
  -H "Authorization: Bearer dpay_test_YOUR_KEY"`,
    node: `const res = await fetch("${BASE}/v1/payments", {
  headers: { Authorization: \`Bearer \${process.env.WISOPAY_KEY}\` },
});`,
    python: `import os, requests

res = requests.get(
    "${BASE}/v1/payments",
    headers={"Authorization": f"Bearer {os.environ['WISOPAY_KEY']}"},
)`,
  },
  create: {
    curl: `curl ${BASE}/v1/payments \\
  -X POST \\
  -H "Authorization: Bearer dpay_test_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: order-1042" \\
  -d '{
    "amount_minor": 25000,
    "currency": "TZS",
    "merchant_reference": "order-1042",
    "phone_number": "0712345678",
    "payer": { "name": "Asha Mushi", "email": "asha@example.com" }
  }'`,
    node: `import crypto from "node:crypto";

const res = await fetch("${BASE}/v1/payments", {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${process.env.WISOPAY_KEY}\`,
    "Content-Type": "application/json",
    "Idempotency-Key": "order-1042", // or crypto.randomUUID(), saved with the order
  },
  body: JSON.stringify({
    amount_minor: 25000,
    currency: "TZS",
    merchant_reference: "order-1042",
    phone_number: "0712345678",
    payer: { name: "Asha Mushi", email: "asha@example.com" },
  }),
});
const payment = await res.json();
if (!res.ok) throw new Error(payment.error.message);`,
    python: `import os, requests

res = requests.post(
    "${BASE}/v1/payments",
    headers={
        "Authorization": f"Bearer {os.environ['WISOPAY_KEY']}",
        "Idempotency-Key": "order-1042",
    },
    json={
        "amount_minor": 25000,
        "currency": "TZS",
        "merchant_reference": "order-1042",
        "phone_number": "0712345678",
        "payer": {"name": "Asha Mushi", "email": "asha@example.com"},
    },
)
payment = res.json()
res.raise_for_status()`,
  },
  card: {
    curl: `curl ${BASE}/v1/payments \\
  -X POST \\
  -H "Authorization: Bearer dpay_test_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: order-1043" \\
  -d '{
    "amount_minor": 25000,
    "currency": "TZS",
    "merchant_reference": "order-1043",
    "payment_method": "card",
    "phone_number": "0712345678",
    "payer": { "name": "Asha Mushi", "email": "asha@example.com" },
    "redirect_url": "https://your-shop.example/orders/1043"
  }'`,
    node: `const res = await fetch("${BASE}/v1/payments", {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${process.env.WISOPAY_KEY}\`,
    "Content-Type": "application/json",
    "Idempotency-Key": "order-1043",
  },
  body: JSON.stringify({
    amount_minor: 25000,
    currency: "TZS",
    merchant_reference: "order-1043",
    payment_method: "card",
    phone_number: "0712345678",
    payer: { name: "Asha Mushi", email: "asha@example.com" },
    redirect_url: "https://your-shop.example/orders/1043",
  }),
});
const payment = await res.json();
// Send the customer to Selcom's secure card page
return Response.redirect(payment.checkoutUrl, 303);`,
    python: `res = requests.post(
    "${BASE}/v1/payments",
    headers={
        "Authorization": f"Bearer {os.environ['WISOPAY_KEY']}",
        "Idempotency-Key": "order-1043",
    },
    json={
        "amount_minor": 25000,
        "currency": "TZS",
        "merchant_reference": "order-1043",
        "payment_method": "card",
        "phone_number": "0712345678",
        "payer": {"name": "Asha Mushi", "email": "asha@example.com"},
        "redirect_url": "https://your-shop.example/orders/1043",
    },
)
payment = res.json()
# Send the customer to payment["checkoutUrl"]`,
  },
  cardResponse: {
    json: `{
  "id": "TXN-T4K3AB-2C8E",
  "object": "payment",
  "status": "PROCESSING",
  "paymentMethod": "card",
  "checkoutUrl": "https://tza.selcom.online/…",
  "amountMinor": 25000,
  "currency": "TZS",
  "merchantReference": "order-1043",
  ...
}`,
  },
  cardReturn: {
    text: `# After paying, the customer lands on your redirect_url with:
https://your-shop.example/orders/1043?payment_id=TXN-T4K3AB-2C8E&status=COMPLETED

# status is COMPLETED, FAILED, CANCELLED or TIMEOUT.
# Always confirm with GET /v1/payments/{id} before fulfilling.`,
  },
  payout: {
    curl: `curl ${BASE}/v1/payouts \\
  -X POST \\
  -H "Authorization: Bearer dpay_test_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: salary-nov-emp-001" \\
  -d '{
    "amount_minor": 150000,
    "channel": "mobile",
    "phone_number": "0712345678",
    "recipient_name": "Juma Mollel",
    "reference": "salary-nov-emp-001",
    "narration": "November salary"
  }'`,
    node: `const res = await fetch("${BASE}/v1/payouts", {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${process.env.WISOPAY_KEY}\`,
    "Content-Type": "application/json",
    "Idempotency-Key": "salary-nov-emp-001",
  },
  body: JSON.stringify({
    amount_minor: 150000,
    channel: "bank",
    bank_code: "CRDB",
    account_number: "0150123456789",
    recipient_name: "Asha Supplies Ltd",
    reference: "INV-1043",
  }),
});
const payout = await res.json();`,
    python: `payout = requests.post(
    "${BASE}/v1/payouts",
    headers={
        "Authorization": f"Bearer {os.environ['WISOPAY_KEY']}",
        "Idempotency-Key": "salary-nov-emp-001",
    },
    json={
        "amount_minor": 150000,
        "channel": "mobile",
        "phone_number": "0712345678",
        "recipient_name": "Juma Mollel",
        "reference": "salary-nov-emp-001",
    },
).json()`,
  },
  payoutObject: {
    json: `{
  "id": "po_3f9a1c7e2b8d4e6f9a1c7e",
  "object": "payout",
  "status": "PROCESSING",
  "amount_minor": 150000,
  "fee_minor": 2000,
  "currency": "TZS",
  "channel": "mobile",
  "recipient": { "name": "Juma Mollel", "phone_number": "255712345678" },
  "reference": "salary-nov-emp-001",
  "narration": "November salary",
  "provider_reference": null,
  "failure_reason": null,
  "livemode": true,
  "created_at": "2026-11-25T09:30:00.000Z",
  "completed_at": null
}`,
  },
  payoutList: {
    curl: `curl "${BASE}/v1/payouts?status=FAILED&limit=50" \\
  -H "Authorization: Bearer dpay_test_YOUR_KEY"

curl ${BASE}/v1/payouts/po_3f9a1c7e2b8d4e6f9a1c7e \\
  -H "Authorization: Bearer dpay_test_YOUR_KEY"`,
  },
  payoutBanks: {
    curl: `curl ${BASE}/v1/payouts/banks -H "Authorization: Bearer dpay_test_YOUR_KEY"
curl ${BASE}/v1/payouts/fee   -H "Authorization: Bearer dpay_live_YOUR_KEY"`,
  },
  payoutBanksResponse: {
    json: `// GET /v1/payouts/banks
{ "object": "list", "data": [ { "code": "CRDB", "name": "CRDB Bank" }, { "code": "NMB", "name": "NMB Bank" }, ... ] }

// GET /v1/payouts/fee (live key)
{ "fee_minor": 2000, "currency": "TZS", "livemode": true, "enabled": true,
  "per_payout_max_minor": 5000000, "daily_max_minor": 20000000 }`,
  },
  payoutWebhook: {
    json: `{
  "event": "payout.completed",          // or payout.failed, payout.reversed
  "data": { "id": "po_3f9a…", "object": "payout", "status": "COMPLETED", ... },
  "timestamp": "2026-11-25T09:30:41.120Z"
}`,
  },
  payment: {
    json: `{
  "id": "TXN-T4K2QX-9B7D",
  "object": "payment",
  "status": "PROCESSING",
  "paymentMethod": "mobile_money",
  "amountMinor": 25000,
  "currency": "TZS",
  "merchantReference": "order-1042",
  "refundedAmountMinor": 0,
  "feeMinor": 625,
  "feeBear": "merchant",
  "chargedAmountMinor": 25000,
  "netAmountMinor": 24375,
  "createdAt": "2026-11-25T08:14:03.120Z",
  "updatedAt": "2026-11-25T08:14:04.481Z"
}`,
  },
  retrieve: {
    curl: `curl ${BASE}/v1/payments/TXN-T4K2QX-9B7D \\
  -H "Authorization: Bearer dpay_test_YOUR_KEY"`,
    node: `const res = await fetch("${BASE}/v1/payments/TXN-T4K2QX-9B7D", {
  headers: { Authorization: \`Bearer \${process.env.WISOPAY_KEY}\` },
});
const payment = await res.json();`,
    python: `res = requests.get(
    "${BASE}/v1/payments/TXN-T4K2QX-9B7D",
    headers={"Authorization": f"Bearer {os.environ['WISOPAY_KEY']}"},
)
payment = res.json()`,
  },
  list: {
    curl: `curl "${BASE}/v1/payments?status=COMPLETED&limit=50" \\
  -H "Authorization: Bearer dpay_test_YOUR_KEY"`,
    node: `let offset = 0;
for (;;) {
  const res = await fetch(\`${BASE}/v1/payments?limit=100&offset=\${offset}\`, {
    headers: { Authorization: \`Bearer \${process.env.WISOPAY_KEY}\` },
  });
  const page = await res.json();
  for (const p of page.data) console.log(p.id, p.status);
  if (!page.has_more) break;
  offset = page.next_cursor;
}`,
    python: `offset = 0
while True:
    page = requests.get(
        "${BASE}/v1/payments",
        params={"limit": 100, "offset": offset},
        headers={"Authorization": f"Bearer {os.environ['WISOPAY_KEY']}"},
    ).json()
    for p in page["data"]:
        print(p["id"], p["status"])
    if not page["has_more"]:
        break
    offset = page["next_cursor"]`,
  },
  listResponse: {
    json: `{
  "object": "list",
  "data": [ { "id": "TXN-T4K2QX-9B7D", "object": "payment", "status": "COMPLETED", ... } ],
  "has_more": true,
  "next_cursor": 50
}`,
  },
  refund: {
    curl: `curl ${BASE}/v1/payments/TXN-T4K2QX-9B7D/refunds \\
  -X POST \\
  -H "Authorization: Bearer dpay_test_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: refund-order-1042-1" \\
  -d '{ "amount_minor": 10000, "reason": "One item out of stock" }'`,
    node: `const res = await fetch("${BASE}/v1/payments/TXN-T4K2QX-9B7D/refunds", {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${process.env.WISOPAY_KEY}\`,
    "Content-Type": "application/json",
    "Idempotency-Key": "refund-order-1042-1",
  },
  body: JSON.stringify({ amount_minor: 10000, reason: "One item out of stock" }),
});
const refund = await res.json();`,
    python: `res = requests.post(
    "${BASE}/v1/payments/TXN-T4K2QX-9B7D/refunds",
    headers={
        "Authorization": f"Bearer {os.environ['WISOPAY_KEY']}",
        "Idempotency-Key": "refund-order-1042-1",
    },
    json={"amount_minor": 10000, "reason": "One item out of stock"},
)
refund = res.json()`,
  },
  refundObject: {
    json: `{
  "id": "ref_5f1c0a9e2b7d4c8e91a3",
  "object": "refund",
  "payment_id": "TXN-T4K2QX-9B7D",
  "amount_minor": 10000,
  "currency": "TZS",
  "reason": "One item out of stock",
  "status": "PENDING",
  "reference": null,
  "created_at": "2026-11-25T09:02:11.004Z",
  "completed_at": null
}`,
  },
  refundList: {
    curl: `curl ${BASE}/v1/payments/TXN-T4K2QX-9B7D/refunds \\
  -H "Authorization: Bearer dpay_test_YOUR_KEY"`,
    node: `const res = await fetch("${BASE}/v1/payments/TXN-T4K2QX-9B7D/refunds", {
  headers: { Authorization: \`Bearer \${process.env.WISOPAY_KEY}\` },
});
const { data: refunds } = await res.json();`,
    python: `refunds = requests.get(
    "${BASE}/v1/payments/TXN-T4K2QX-9B7D/refunds",
    headers={"Authorization": f"Bearer {os.environ['WISOPAY_KEY']}"},
).json()["data"]`,
  },
  error: {
    json: `{
  "error": {
    "type": "validation_error",
    "code": "validation_error",
    "message": "amount_minor must be at least 200 for TZS payments",
    "param": "amount_minor",
    "request_id": "6f0c2c1e-3d7a-4b8e-9a51-0b2f7d1e4c90"
  }
}`,
  },
  webhookPayload: {
    json: `POST https://your-site.example/webhooks/wisopay
Content-Type: application/json
X-Wisopay-Signature: 3b9f0c…e41a   (hex HMAC-SHA256 of the raw body)
X-Wisopay-Timestamp: 2026-11-25T08:14:31.552Z

{
  "event": "payment.completed",
  "data": {
    "id": "TXN-T4K2QX-9B7D",
    "status": "COMPLETED",
    "amount_minor": "25000",
    "currency": "TZS",
    "merchant_reference": "order-1042",
    "created_at": "2026-11-25T08:14:03.120Z",
    "updated_at": "2026-11-25T08:14:31.402Z"
  },
  "timestamp": "2026-11-25T08:14:31.552Z"
}`,
  },
  verify: {
    node: `import crypto from "node:crypto";
import express from "express";

const app = express();

// Use the raw body: the signature is over the exact bytes we sent
app.post("/webhooks/wisopay", express.raw({ type: "application/json" }), async (req, res) => {
  const expected = crypto
    .createHmac("sha256", process.env.WISOPAY_WEBHOOK_SECRET) // whsec_…
    .update(req.body)
    .digest("hex");
  const given = req.get("X-Wisopay-Signature") ?? "";
  const ok = given.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected));
  if (!ok) return res.sendStatus(400);

  const event = JSON.parse(req.body.toString("utf8"));
  if (event.event === "payment.completed") {
    // Look the payment up before fulfilling (see "Confirm before you fulfil")
    await markOrderPaid(event.data.merchant_reference, event.data.id);
  }
  res.sendStatus(200);
});`,
    python: `import hashlib, hmac, json, os
from flask import Flask, request

app = Flask(__name__)

@app.post("/webhooks/wisopay")
def wisopay_webhook():
    raw = request.get_data()  # the exact bytes we sent
    expected = hmac.new(
        os.environ["WISOPAY_WEBHOOK_SECRET"].encode(), raw, hashlib.sha256
    ).hexdigest()
    if not hmac.compare_digest(request.headers.get("X-Wisopay-Signature", ""), expected):
        return "", 400

    event = json.loads(raw)
    if event["event"] == "payment.completed":
        mark_order_paid(event["data"]["merchant_reference"], event["data"]["id"])
    return "", 200`,
  },
} satisfies Record<string, Sample>

/* ── Navigation ────────────────────────────────────────────────────────────── */

const NAV: { group: string; items: { id: string; label: string }[] }[] = [
  {
    group: 'Get started',
    items: [
      { id: 'introduction', label: 'Introduction' },
      { id: 'how-it-works', label: 'How a payment works' },
      { id: 'authentication', label: 'Authentication' },
      { id: 'sandbox', label: 'Sandbox and live' },
    ],
  },
  {
    group: 'Using the API',
    items: [
      { id: 'idempotency', label: 'Idempotency' },
      { id: 'errors', label: 'Errors' },
      { id: 'pagination', label: 'Pagination' },
      { id: 'rate-limits', label: 'Rate limits' },
    ],
  },
  {
    group: 'Payments',
    items: [
      { id: 'payment-object', label: 'The payment object' },
      { id: 'create-payment', label: 'Create a payment' },
      { id: 'card-payments', label: 'Card payments' },
      { id: 'retrieve-payment', label: 'Retrieve a payment' },
      { id: 'list-payments', label: 'List payments' },
    ],
  },
  {
    group: 'Refunds',
    items: [
      { id: 'refund-object', label: 'The refund object' },
      { id: 'create-refund', label: 'Refund a payment' },
      { id: 'list-refunds', label: 'List refunds' },
    ],
  },
  {
    group: 'Payouts',
    items: [
      { id: 'payouts', label: 'Sending payouts' },
      { id: 'payout-object', label: 'The payout object' },
      { id: 'create-payout', label: 'Send a payout' },
      { id: 'list-payouts', label: 'List and retrieve' },
      { id: 'payout-banks', label: 'Banks, fee and limits' },
    ],
  },
  {
    group: 'Webhooks',
    items: [
      { id: 'webhooks', label: 'Receiving events' },
      { id: 'verify-signatures', label: 'Verifying signatures' },
      { id: 'confirm', label: 'Confirm before you fulfil' },
    ],
  },
  {
    group: 'More',
    items: [
      { id: 'fees', label: 'Fees' },
      { id: 'changelog', label: 'Changelog' },
    ],
  },
]

/** The last section whose top has scrolled past the line just below the fixed header. */
function useActiveSection(topOffset: number): string {
  const [active, setActive] = useState('introduction')
  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      const line = topOffset + 120
      const els = Array.from(document.querySelectorAll<HTMLElement>('[data-section]'))
      let current = els[0]?.id ?? 'introduction'
      for (const el of els) {
        if (el.getBoundingClientRect().top <= line) current = el.id
        else break
      }
      // At the very bottom, the last sections can't reach the line: pick the last one
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) current = els[els.length - 1]?.id ?? current
      setActive(current)
    }
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [topOffset])
  return active
}

/* ── The page ──────────────────────────────────────────────────────────────── */

export type ApiDocsProps = {
  /** Where "API keys" links point: the portal's own page, or the portal's sign-in from the public site. */
  keysHref?: string
  webhooksHref?: string
  /** Pixels of fixed header above the docs, so the sticky nav and anchors clear it. */
  topOffset?: number
}

export function ApiDocs({ keysHref = 'https://portal.wisopay.io/developers', webhooksHref = 'https://portal.wisopay.io/developers?tab=webhooks', topOffset = 0 }: ApiDocsProps) {
  const active = useActiveSection(topOffset)
  const flat = useMemo(() => NAV.flatMap((g) => g.items), [])

  const go = (id: string, smooth = true) => {
    const el = document.getElementById(id)
    if (!el) return
    // On phones the sticky section picker sits under the header too
    const picker = document.querySelector<HTMLElement>('.wd-mobilenav')
    const extra = picker && getComputedStyle(picker).display !== 'none' ? picker.offsetHeight + 8 : 0
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - topOffset - 16 - extra, behavior: smooth ? 'smooth' : 'auto' })
    history.replaceState(null, '', `#${id}`)
  }

  useEffect(() => {
    const id = decodeURIComponent(location.hash.slice(1))
    if (!id) return
    // Once now and again after fonts and images settle the layout
    const a = setTimeout(() => go(id, false), 50)
    const b = setTimeout(() => go(id, false), 600)
    return () => { clearTimeout(a); clearTimeout(b) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="wd" style={{ ['--wd-top' as string]: `${topOffset}px` }}>
      <nav className="wd-nav" aria-label="API docs">
        {NAV.map((g) => (
          <div key={g.group} className="wd-navgroup">
            <p>{g.group}</p>
            {g.items.map((i) => (
              <a key={i.id} href={`#${i.id}`} aria-current={active === i.id ? 'true' : undefined} onClick={(e) => { e.preventDefault(); go(i.id) }}>
                {i.label}
              </a>
            ))}
          </div>
        ))}
      </nav>

      <div className="wd-mobilenav">
        <select value={active} onChange={(e) => go(e.target.value)} aria-label="Jump to section">
          {flat.map((i) => <option key={i.id} value={i.id}>{i.label}</option>)}
        </select>
      </div>

      <main className="wd-main">
        <Section
          id="introduction"
          title="WisoPay API"
          aside={<Code title="Base URL" sample={{ text: `${BASE}\n\n# Endpoints\nPOST /v1/payments\nGET  /v1/payments/{id}\nGET  /v1/payments\nPOST /v1/payments/{id}/refunds\nGET  /v1/payments/{id}/refunds\nPOST /v1/payouts\nGET  /v1/payouts\nGET  /v1/payouts/{id}\nGET  /v1/payouts/banks\nGET  /v1/payouts/fee` }} />}
        >
          <p className="wd-lead">Collect mobile money and card payments in Tanzania from your website, app or back office. You send the customer’s phone number and an amount; WisoPay pushes a payment prompt to their phone (or sends them to a secure card page) and tells you when they’ve paid.</p>
          <p>The API is REST over HTTPS with JSON request and response bodies. Amounts are whole numbers in the currency’s smallest unit (<C>amount_minor</C>); for Tanzanian shillings that is simply shillings, so <C>25000</C> is TZS 25,000.</p>
          <p>Every response carries an <C>X-Request-Id</C> header. Include it when you contact support about a request.</p>
        </Section>

        <Section
          id="how-it-works"
          title="How a payment works"
          aside={<Code title="Lifecycle" sample={{ text: `CREATED ─▶ PROCESSING ─▶ COMPLETED ─▶ REFUNDED (fully refunded)
                    └────▶ FAILED
                    └────▶ TIMEOUT / CANCELLED` }} />}
        >
          <ol className="wd-steps">
            <li><strong>You create a payment</strong> with <C>POST /v1/payments</C>, sending the amount, your own order reference and the customer’s phone number.</li>
            <li><strong>The customer approves it on their phone.</strong> WisoPay sends a USSD prompt from their mobile money network; they enter their PIN. The payment is <C>PROCESSING</C> while we wait.</li>
            <li><strong>You’re told the result.</strong> When the money arrives the payment becomes <C>COMPLETED</C> and we send a <C>payment.completed</C> webhook to your server. The customer also gets an SMS receipt from WisoPay.</li>
            <li><strong>You fulfil the order</strong> after confirming the payment (see <a href="#confirm" onClick={(e) => { e.preventDefault(); go('confirm') }}>Confirm before you fulfil</a>).</li>
          </ol>
          <p>If the customer declines, has too little balance or ignores the prompt, the payment ends as <C>FAILED</C>, <C>TIMEOUT</C> or <C>CANCELLED</C>. Create a new payment (with a new idempotency key) to ask again.</p>
        </Section>

        <Section id="authentication" title="Authentication" aside={<Code sample={S.auth} />}>
          <p>Authenticate every request with a secret API key in the <C>Authorization</C> header as a bearer token. Create and revoke keys in the portal under <a href={keysHref}>Developers → API keys</a>. The full key is shown once, when you create it.</p>
          <ul>
            <li><C>dpay_test_…</C> keys use the <strong>sandbox</strong>: no real money moves.</li>
            <li><C>dpay_live_…</C> keys take <strong>real payments</strong>. They are available once WisoPay has approved your business (KYC) and enabled live mode.</li>
          </ul>
          <Note kind="warn">Keep keys on your server. Never put them in a mobile app, browser JavaScript or a public repository. If a key leaks, revoke it in the portal and create a new one.</Note>
          <p>A missing key returns <C>401 missing_api_key</C>; a wrong, revoked or disabled key returns <C>401 invalid_api_key</C>.</p>
        </Section>

        <Section
          id="sandbox"
          title="Sandbox and live"
          aside={<Code title="Same code, different key" sample={{ text: `# Sandbox: payments complete on their own, no money moves\nAuthorization: Bearer dpay_test_…\n\n# Live: real prompts to real phones\nAuthorization: Bearer dpay_live_…` }} />}
        >
          <p>Sandbox and live use the same base URL and endpoints; the key decides which one you’re in. Each key only sees its own payments, so a sandbox key can’t read live payments and the other way round.</p>
          <p>In the sandbox, no prompt is sent: a payment completes straight away, and fires the same <C>payment.completed</C> webhook as live. Retrieve it to see <C>COMPLETED</C>. Sandbox refunds complete immediately.</p>
          <p>Test the unhappy paths (failed, timed out, refunds) in the sandbox before going live, and run one small live payment to your own phone before launching.</p>
        </Section>

        <Section id="idempotency" title="Idempotency" aside={<Code title="Header" sample={{ text: 'Idempotency-Key: order-1042' }} />}>
          <p>Every <C>POST</C> needs an <C>Idempotency-Key</C> header, a string you choose that is unique to the thing you’re creating, such as your order ID. Requests without one get <C>400 missing_idempotency_key</C>.</p>
          <p>If a request times out or your connection drops, send it again with <strong>the same key</strong>. You get the original payment or refund back instead of charging the customer twice. Use a <strong>new key</strong> when you really do want a new payment, for example when the customer tries again after a failure.</p>
          <p>Keys are scoped to your API key’s environment (payments) or to the payment (refunds).</p>
        </Section>

        <Section id="errors" title="Errors" aside={<Code title="Error response" sample={S.error} />}>
          <p>Errors use standard HTTP status codes and the same JSON shape. <C>message</C> is written for developers; <C>param</C> names the field at fault, when there is one.</p>
          <table className="wd-table">
            <thead><tr><th>Status</th><th>type</th><th>When</th></tr></thead>
            <tbody>
              <tr><td>400</td><td><C>validation_error</C></td><td>A field is missing or invalid, or the action isn’t allowed (for example refunding a failed payment).</td></tr>
              <tr><td>401</td><td><C>authentication_error</C></td><td>No API key, or the key is wrong or revoked.</td></tr>
              <tr><td>404</td><td><C>not_found_error</C></td><td>The payment doesn’t exist, or belongs to another account or environment.</td></tr>
              <tr><td>429</td><td><C>rate_limit_error</C></td><td>Too many requests; wait for the <C>Retry-After</C> seconds.</td></tr>
              <tr><td>500</td><td><C>api_error</C></td><td>Something went wrong on our side. Safe to retry with the same idempotency key.</td></tr>
              <tr><td>502/503</td><td><C>provider_error</C></td><td>The mobile money network didn’t respond. Retry shortly.</td></tr>
            </tbody>
          </table>
          <p>Specific <C>code</C> values you may want to handle: <C>missing_idempotency_key</C>, <C>invalid_content_type</C>, <C>payment_not_refundable</C>, <C>payment_already_refunded</C>, <C>amount_too_large</C>, <C>insufficient_balance</C>, <C>card_payments_unavailable</C>, and for payouts <C>amount_over_limit</C>, <C>daily_limit_reached</C>, <C>payouts_not_enabled</C>.</p>
        </Section>

        <Section id="pagination" title="Pagination" aside={<Code title="List response" sample={S.listResponse} />}>
          <p>List endpoints return <C>{'{ object: "list", data, has_more, next_cursor }'}</C>. Pass <C>limit</C> (1–100, default 25) and <C>offset</C>. When <C>has_more</C> is true, request the next page with <C>offset</C> set to <C>next_cursor</C>.</p>
        </Section>

        <Section id="rate-limits" title="Rate limits">
          <p>Keep to about 100 requests per second per API key (short bursts up to 200). Above that, requests can get <C>429 rate_limit_error</C> with a <C>Retry-After</C> header. Use webhooks rather than tight polling to learn when payments complete.</p>
        </Section>

        <Section id="payment-object" title="The payment object" aside={<Code title="Payment" sample={S.payment} />}>
          <Fields
            title="Attributes"
            fields={[
              { name: 'id', type: 'string', desc: <>Unique ID, e.g. <C>TXN-T4K2QX-9B7D</C>.</> },
              { name: 'object', type: 'string', desc: <>Always <C>payment</C>.</> },
              { name: 'status', type: 'string', desc: <><C>CREATED</C>, <C>PROCESSING</C>, <C>COMPLETED</C>, <C>FAILED</C>, <C>TIMEOUT</C>, <C>CANCELLED</C> or <C>REFUNDED</C>. Only <C>COMPLETED</C> means you’ve been paid.</> },
              { name: 'paymentMethod', type: 'string', desc: <><C>mobile_money</C> or <C>card</C>.</> },
              { name: 'checkoutUrl', type: 'string | null', desc: <>Card payments only: Selcom’s secure card page to send the customer to.</> },
              { name: 'amountMinor', type: 'integer', desc: 'The amount you asked for.' },
              { name: 'currency', type: 'string', desc: <><C>TZS</C>.</> },
              { name: 'merchantReference', type: 'string', desc: 'Your reference, as you sent it.' },
              { name: 'feeMinor', type: 'integer', desc: 'WisoPay’s fee for this payment.' },
              { name: 'feeBear', type: 'string', desc: <><C>merchant</C> (the fee comes out of what you receive) or <C>customer</C> (the customer pays amount + fee). Set in the portal.</> },
              { name: 'chargedAmountMinor', type: 'integer', desc: 'What the customer is asked to pay.' },
              { name: 'netAmountMinor', type: 'integer', desc: 'What reaches your WisoPay balance.' },
              { name: 'refundedAmountMinor', type: 'integer', desc: 'Total refunded so far.' },
              { name: 'createdAt / updatedAt', type: 'string', desc: 'ISO 8601 timestamps, UTC.' },
            ]}
          />
        </Section>

        <Section
          id="create-payment"
          title="Create a payment"
          aside={<><Code sample={S.create} /><Code title="Response · 201" sample={S.payment} /></>}
        >
          <Endpoint method="POST" path="/v1/payments" />
          <p>Sends a payment prompt to the customer’s phone. Returns <C>201</C> with the payment, usually in <C>PROCESSING</C>. Don’t treat the order as paid yet: wait for <C>COMPLETED</C>.</p>
          <Fields
            title="Body"
            fields={[
              { name: 'amount_minor', type: 'integer', required: true, desc: <>Amount in shillings. Minimum <C>200</C> for TZS.</> },
              { name: 'currency', type: 'string', required: true, desc: <><C>TZS</C>.</> },
              { name: 'merchant_reference', type: 'string', required: true, desc: 'Your order or invoice reference. It comes back on the payment and in the webhook.' },
              { name: 'phone_number', type: 'string', required: true, desc: <>The customer’s mobile number: <C>0712345678</C>, <C>712345678</C> or <C>255712345678</C>.</> },
              { name: 'payment_method', type: 'string', desc: <><C>mobile_money</C> (default: a payment prompt on the phone) or <C>card</C> (see <a href="#card-payments" onClick={(e) => { e.preventDefault(); go('card-payments') }}>Card payments</a>).</> },
              { name: 'payer.name', type: 'string', desc: <>Shown in your portal and on receipts. Required for <C>card</C>.</> },
              { name: 'payer.email', type: 'string', desc: <>If given, the customer also gets an email receipt. Required for <C>card</C>.</> },
              { name: 'redirect_url', type: 'string', desc: <>Card only: where to send the customer after paying.</> },
              { name: 'cancel_url', type: 'string', desc: <>Card only: where to send the customer if they cancel or the payment fails. Defaults to <C>redirect_url</C>.</> },
            ]}
          />
          <Fields title="Headers" fields={[{ name: 'Idempotency-Key', type: 'string', required: true, desc: 'See Idempotency.' }, { name: 'Content-Type', type: 'string', required: true, desc: <><C>application/json</C></> }]} />
        </Section>

        <Section
          id="card-payments"
          title="Card payments"
          aside={<><Code sample={S.card} /><Code title="Response · 201" sample={S.cardResponse} /><Code title="Back on your site" sample={S.cardReturn} /></>}
        >
          <p>Customers can pay with Visa or Mastercard on Selcom’s secure card page, which also handles the bank’s 3-D Secure check. Card details never touch your server or WisoPay.</p>
          <ol className="wd-steps">
            <li>Create the payment with <C>"payment_method": "card"</C>, the customer’s name, email and phone, and an optional <C>redirect_url</C>.</li>
            <li>Send the customer to <C>checkoutUrl</C> from the response (a redirect, or a link they tap).</li>
            <li>When they finish, they come back to your <C>redirect_url</C> with <C>payment_id</C> and <C>status</C> added. Without a <C>redirect_url</C>, WisoPay shows them a receipt page.</li>
            <li>If they press Cancel on the card page (or the payment fails), they go to your <C>cancel_url</C> instead, with <C>payment_id</C> and <C>status=FAILED</C> added, and you get the <C>payment.failed</C> webhook.</li>
            <li>Confirm with <C>GET /v1/payments/{'{id}'}</C> (or the <C>payment.completed</C> webhook) before fulfilling. The query string alone isn’t proof of payment.</li>
          </ol>
          <p>Card payments have their own fee, shown on the payment as <C>feeMinor</C>. In the sandbox, card payments complete straight away and <C>checkoutUrl</C> points to the result page, so you can test the round trip.</p>
          <p>If card payments aren’t enabled on WisoPay yet, you get <C>400 card_payments_unavailable</C>; use mobile money instead. Card payment is also offered on your payment links once it’s enabled.</p>
        </Section>

        <Section id="retrieve-payment" title="Retrieve a payment" aside={<Code sample={S.retrieve} />}>
          <Endpoint method="GET" path="/v1/payments/{id}" />
          <p>Returns the current state of one payment. Payments made with another account’s key, or in the other environment, return <C>404</C>.</p>
        </Section>

        <Section id="list-payments" title="List payments" aside={<><Code sample={S.list} /><Code title="Response · 200" sample={S.listResponse} /></>}>
          <Endpoint method="GET" path="/v1/payments" />
          <p>All payments in your key’s environment, newest first.</p>
          <Fields
            title="Query"
            fields={[
              { name: 'status', type: 'string', desc: <>Only payments in this status, e.g. <C>COMPLETED</C>.</> },
              { name: 'merchant_reference', type: 'string', desc: 'Only payments with this reference: handy for finding an order’s payment.' },
              { name: 'limit', type: 'integer', desc: '1–100, default 25.' },
              { name: 'offset', type: 'integer', desc: <>Start position; use <C>next_cursor</C> from the previous page.</> },
            ]}
          />
        </Section>

        <Section id="refund-object" title="The refund object" aside={<Code title="Refund" sample={S.refundObject} />}>
          <Fields
            title="Attributes"
            fields={[
              { name: 'id', type: 'string', desc: <>Unique ID, e.g. <C>ref_5f1c…</C>.</> },
              { name: 'payment_id', type: 'string', desc: 'The payment refunded.' },
              { name: 'amount_minor', type: 'integer', desc: 'Amount refunded.' },
              { name: 'status', type: 'string', desc: <><C>PENDING</C> until the money has been sent back to the customer, then <C>COMPLETED</C>.</> },
              { name: 'reference', type: 'string | null', desc: 'The mobile money transfer reference, once sent.' },
              { name: 'reason', type: 'string | null', desc: 'Your reason, if you gave one.' },
              { name: 'created_at / completed_at', type: 'string', desc: 'ISO 8601 timestamps.' },
            ]}
          />
        </Section>

        <Section id="create-refund" title="Refund a payment" aside={<><Code sample={S.refund} /><Code title="Response · 201" sample={S.refundObject} /></>}>
          <Endpoint method="POST" path="/v1/payments/{id}/refunds" />
          <p>Refunds all of a <C>COMPLETED</C> payment, or part of it. You can make several partial refunds until the whole amount is refunded; the payment then becomes <C>REFUNDED</C>.</p>
          <p>The amount leaves your WisoPay balance straight away, and WisoPay sends it to the customer’s mobile money number, normally within one working day. The customer gets an SMS when the refund is made and again when it’s sent, and the refund moves to <C>COMPLETED</C>. If your available balance is too low you get <C>400 insufficient_balance</C>.</p>
          <Fields
            title="Body"
            fields={[
              { name: 'amount_minor', type: 'integer', desc: 'Amount to refund. Leave it out to refund everything not yet refunded.' },
              { name: 'reason', type: 'string', desc: 'Shown to WisoPay and in your portal (up to 500 characters).' },
            ]}
          />
          <Note>Refunds are also available in the portal, from any completed payment.</Note>
        </Section>

        <Section id="list-refunds" title="List refunds" aside={<Code sample={S.refundList} />}>
          <Endpoint method="GET" path="/v1/payments/{id}/refunds" />
          <p>All refunds on one payment, oldest first, as a list (<C>{'{ object: "list", data, has_more }'}</C>).</p>
        </Section>

        <Section id="payouts" title="Sending payouts">
          <p>Send money from your WisoPay balance to any mobile wallet (M-Pesa, Airtel Money, Mixx by Yas, HaloPesa) or Tanzanian bank account: salaries, supplier payments, customer cash-outs, agent commissions.</p>
          <ul>
            <li>Each payout takes the amount <strong>plus WisoPay’s payout fee</strong> from your available balance straight away. If it fails or is reversed, both come back to your balance.</li>
            <li>Most mobile payouts arrive within a minute; bank transfers can take longer. You get a <C>payout.completed</C> or <C>payout.failed</C> webhook.</li>
            <li>Live payouts are for verified businesses: WisoPay switches them on for your account and sets your per-payout and daily limits. Ask <a href="mailto:support@wisopay.io">support@wisopay.io</a>.</li>
            <li>In the <strong>sandbox</strong>, payouts complete straight away with no fee and no money moving. Use a phone or account number ending in <C>0000</C> to test a failure.</li>
            <li>You can also send payouts from the portal, one at a time or as a CSV file of up to 500.</li>
          </ul>
          <Note kind="warn">Anyone holding your live API key can send your money. Keep keys on your server only, and use a different <C>Idempotency-Key</C> for every payout you mean to make.</Note>
        </Section>

        <Section id="payout-object" title="The payout object" aside={<Code title="Payout" sample={S.payoutObject} />}>
          <Fields
            title="Attributes"
            fields={[
              { name: 'id', type: 'string', desc: <>Unique ID, e.g. <C>po_3f9a…</C>.</> },
              { name: 'status', type: 'string', desc: <><C>PENDING</C> (queued), <C>PROCESSING</C> (with the network or bank), <C>COMPLETED</C>, <C>FAILED</C> or <C>REVERSED</C> (returned after completing).</> },
              { name: 'amount_minor', type: 'integer', desc: 'What the recipient gets.' },
              { name: 'fee_minor', type: 'integer', desc: 'WisoPay’s fee, also taken from your balance.' },
              { name: 'channel', type: 'string', desc: <><C>mobile</C> or <C>bank</C>.</> },
              { name: 'recipient', type: 'object', desc: <><C>name</C>, and <C>phone_number</C> or <C>bank_code</C> + <C>account_number</C>.</> },
              { name: 'reference', type: 'string | null', desc: 'Your own reference, as you sent it.' },
              { name: 'provider_reference', type: 'string | null', desc: 'The network’s or bank’s transaction reference once sent: give it to the recipient if they ask.' },
              { name: 'failure_reason', type: 'string | null', desc: 'Why it failed or was reversed.' },
              { name: 'livemode', type: 'boolean', desc: <><C>false</C> for sandbox payouts.</> },
            ]}
          />
        </Section>

        <Section id="create-payout" title="Send a payout" aside={<><Code sample={S.payout} /><Code title="Response · 201" sample={S.payoutObject} /></>}>
          <Endpoint method="POST" path="/v1/payouts" />
          <p>Returns <C>201</C> with the payout, usually <C>PROCESSING</C>. Sending again with the same <C>Idempotency-Key</C> returns the same payout (<C>200</C>), so a retry never pays twice.</p>
          <Fields
            title="Body"
            fields={[
              { name: 'amount_minor', type: 'integer', required: true, desc: <>Amount in shillings, at least <C>500</C>.</> },
              { name: 'channel', type: 'string', required: true, desc: <><C>mobile</C> or <C>bank</C>.</> },
              { name: 'phone_number', type: 'string', desc: <>Mobile: the wallet number, e.g. <C>0712345678</C>.</> },
              { name: 'bank_code', type: 'string', desc: <>Bank: a code from <a href="#payout-banks" onClick={(e) => { e.preventDefault(); go('payout-banks') }}>/v1/payouts/banks</a>, e.g. <C>CRDB</C>, <C>NMB</C>.</> },
              { name: 'account_number', type: 'string', desc: 'Bank: the account number.' },
              { name: 'recipient_name', type: 'string', required: true, desc: 'Full name or company name of the recipient.' },
              { name: 'reference', type: 'string', desc: 'Your reference (up to 120 characters).' },
              { name: 'narration', type: 'string', desc: 'Reason shown to the network or bank (up to 140).' },
              { name: 'currency', type: 'string', desc: <><C>TZS</C> (default).</> },
            ]}
          />
          <p>Errors to handle: <C>insufficient_balance</C>, <C>amount_over_limit</C>, <C>daily_limit_reached</C>, <C>payouts_not_enabled</C>, <C>payouts_unavailable</C>, and <C>validation_error</C> with <C>param</C> naming the field.</p>
        </Section>

        <Section id="list-payouts" title="List and retrieve" aside={<Code sample={S.payoutList} />}>
          <Endpoint method="GET" path="/v1/payouts" />
          <p>Your payouts in the key’s environment, newest first. Filter with <C>status</C> or <C>reference</C>; page with <C>limit</C> and <C>offset</C> (see <a href="#pagination" onClick={(e) => { e.preventDefault(); go('pagination') }}>Pagination</a>).</p>
          <Endpoint method="GET" path="/v1/payouts/{id}" />
          <p>One payout. Use it to confirm the final status if you missed a webhook.</p>
        </Section>

        <Section id="payout-banks" title="Banks, fee and limits" aside={<><Code sample={S.payoutBanks} /><Code title="Responses" sample={S.payoutBanksResponse} /></>}>
          <Endpoint method="GET" path="/v1/payouts/banks" />
          <p>The banks you can pay to, with the <C>bank_code</C> to send. Includes CRDB, NMB, NBC, ABSA, Equity, Stanbic, Exim, DTB and 30 more.</p>
          <Endpoint method="GET" path="/v1/payouts/fee" />
          <p>Your fee per payout and your limits. With a sandbox key the fee is <C>0</C>.</p>
        </Section>

        <Section id="webhooks" title="Receiving events" aside={<Code title="What we send" sample={S.webhookPayload} />}>
          <p>Add your endpoint in the portal under <a href={webhooksHref}>Developers → Webhooks</a>. It must be HTTPS. You get a signing secret (<C>whsec_…</C>) once, when you add it.</p>
          <p>We send <C>payment.completed</C> when a payment succeeds, and <C>payout.completed</C>, <C>payout.failed</C> and <C>payout.reversed</C> for your payouts (the payout object is in <C>data</C>). Failed payments and refunds don’t send webhooks yet: check them with <a href="#retrieve-payment" onClick={(e) => { e.preventDefault(); go('retrieve-payment') }}>Retrieve a payment</a>.</p>
          <ul>
            <li>Reply with any <C>2xx</C> within 10 seconds. Do slow work after replying.</li>
            <li>If we don’t get a <C>2xx</C>, we try again, up to 5 attempts in all over about a minute, then stop. So don’t rely on the webhook alone (see <a href="#confirm" onClick={(e) => { e.preventDefault(); go('confirm') }}>Confirm before you fulfil</a>).</li>
            <li>The same event can arrive more than once. Use the payment <C>id</C> to make handling idempotent.</li>
            <li>Your endpoint receives sandbox and live events alike. If that matters, retrieve the payment with the matching key: the other key gets <C>404</C>.</li>
          </ul>
        </Section>

        <Section id="verify-signatures" title="Verifying signatures" aside={<Code sample={S.verify} />}>
          <p>Each request has an <C>X-Wisopay-Signature</C> header: the hex HMAC-SHA256 of the raw request body, keyed with your webhook’s signing secret. Compute it yourself over the exact bytes you received (before any JSON parsing) and compare in constant time. Reject the request if they don’t match.</p>
          <p>If you rotate the secret in the portal, the old one stops working immediately.</p>
        </Section>

        <Section id="confirm" title="Confirm before you fulfil">
          <p>Before you ship goods or credit an account, check the payment with <C>GET /v1/payments/{'{id}'}</C> and confirm that <C>status</C> is <C>COMPLETED</C> and that <C>amountMinor</C> and <C>merchantReference</C> match your order. This protects you against a forged or replayed webhook, and also covers the case where a webhook is delayed: a background job can poll payments still <C>PROCESSING</C> after a few minutes.</p>
        </Section>

        <Section id="fees" title="Fees">
          <p>Each completed payment has a WisoPay fee (<C>feeMinor</C>). By default it comes out of what you receive. You can choose instead to have customers pay it on top of the price; set this in the portal under Settings. The payment shows both <C>chargedAmountMinor</C> (what the customer paid) and <C>netAmountMinor</C> (what you get).</p>
          <p>Your balance, withdrawals and monthly statements are in the portal.</p>
        </Section>

        <Section id="changelog" title="Changelog">
          <dl className="wd-changelog">
            <dt>25 November 2026</dt>
            <dd>
              <ul>
                <li>Payouts API: send money from your balance to mobile wallets and bank accounts (<C>/v1/payouts</C>), with <C>payout.*</C> webhooks, sandbox testing and bulk payouts in the portal.</li>
                <li>Card payments: <C>"payment_method": "card"</C> returns a <C>checkoutUrl</C> for Selcom’s secure card page; optional <C>redirect_url</C>. Payments now show <C>paymentMethod</C>.</li>
                <li>Sandbox payments complete again (some were left in <C>CREATED</C>).</li>
                <li>Refunds API: <C>POST</C> and <C>GET /v1/payments/{'{id}'}/refunds</C>, with partial refunds. (The older path <C>/v1/refunds/payments/{'{id}'}/refunds</C> still works.)</li>
                <li><C>GET /v1/payments</C> now lists payments in every status, newest first, and takes <C>status</C> and <C>merchant_reference</C> filters. Previously it only returned payments still in <C>CREATED</C>.</li>
                <li><C>GET /v1/payments/{'{id}'}</C> returns <C>404</C> for payments outside your key’s environment, and a proper <C>404</C> instead of <C>500</C> for unknown IDs.</li>
              </ul>
            </dd>
          </dl>
          <p className="wd-muted">Questions? Email <a href="mailto:support@wisopay.io">support@wisopay.io</a>.</p>
        </Section>
      </main>
    </div>
  )
}

export default ApiDocs
