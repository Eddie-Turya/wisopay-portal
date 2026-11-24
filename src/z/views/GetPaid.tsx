import { tr } from "../i18n";

import { useMemo, useState } from "react";
import { MoreHorizontal, Search } from "lucide-react";
import { date, money, usd } from "../data";
import { useApi, useLive } from "../live";

import { Avatar, Button, Card, Drawer, Input, PageHeader, Pagination, Stat, Status, cx, td, th, trHover } from "../ui";

/* ================= Customers ================= */

type Cust = { phone: string; name: string; email: string; count: number; attempts: number; total: number; last: number; network: string };

export function Customers() {
  const { payments, env } = useLive();
  const custQ = useApi<{ data: Cust[] }>("/dashboard/customers", env);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState<Cust | null>(null);

  const all = useMemo(() => [...(custQ.data?.data ?? [])].sort((a, b) => b.total - a.total), [custQ.data]);

  const filtered = all.filter((c) => !q || (c.name + c.phone + c.email).toLowerCase().includes(q.toLowerCase()));
  const PER = 12;

  return (
    <>
      <PageHeader title={tr("Customers")} sub={tr("Everyone who has paid you, with their full history.")} />
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label={tr("Total customers")} value={all.length.toLocaleString("en-US")} />
        <Stat label={tr("Repeat customers")} value={all.length ? `${((all.filter((c) => c.count > 1).length / all.length) * 100).toFixed(0)}%` : "—"} sub={tr("paid more than once")} />
        <Stat label={tr("Avg. lifetime value")} value={usd(all.length ? all.reduce((s, c) => s + c.total, 0) / all.length : 0)} />
      </div>
      <div className="relative mb-4 sm:w-72">
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-p-faint" />
        <Input placeholder={tr("Search customers…")} value={q} onChange={(e) => { setQ(e.target.value); setPage(0); }} className="pl-9" />
      </div>
      <Card pad={false}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className={th}>{tr("Customer")}</th>
                <th className={cx(th, "hidden md:table-cell")}>{tr("Phone")}</th>
                <th className={th}>{tr("Payments")}</th>
                <th className={th}>{tr("Total spent")}</th>
                <th className={cx(th, "hidden lg:table-cell text-right")}>{tr("Last payment")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-sm text-p-muted">
                    {custQ.loading ? tr("Loading…") : all.length ? tr("No customers match.") : tr("Customers appear here after their first payment.")}
                  </td>
                </tr>
              )}
              {filtered.slice(page * PER, page * PER + PER).map((c) => (
                <tr key={c.phone} className={trHover} onClick={() => setOpen(c)}>
                  <td className={td}>
                    <span className="flex items-center gap-3">
                      <Avatar name={c.name} />
                      <span>
                        <span className="block">{c.name}</span>
                        {c.email && <span className="block text-xs text-p-faint">{c.email}</span>}
                      </span>
                    </span>
                  </td>
                  <td className={cx(td, "hidden text-p-muted md:table-cell")}>{c.phone}</td>
                  <td className={cx(td, "tabular-nums")}>{c.count}</td>
                  <td className={cx(td, "font-medium tabular-nums")}>{usd(c.total)}</td>
                  <td className={cx(td, "hidden text-right text-p-muted tabular-nums lg:table-cell")}>{date(c.last)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} pages={Math.ceil(filtered.length / PER)} total={filtered.length} onPage={setPage} />
      </Card>

      <Drawer open={!!open} onClose={() => setOpen(null)} title={tr("Customer")} footer={<Button className="flex-1"><MoreHorizontal className="h-4 w-4" /> {tr("More actions")}</Button>}>
        {open && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar name={open.name} size={52} />
              <div>
                <p className="text-lg font-semibold">{open.name}</p>
                <p className="text-sm text-p-muted">
                  {open.phone}{open.network ? ` · ${open.network}` : ""}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-p-panel2 p-4">
                <p className="text-xs text-p-faint">{tr("Total spent")}</p>
                <p className="mt-1 font-semibold tabular-nums">{usd(open.total)}</p>
              </div>
              <div className="rounded-xl bg-p-panel2 p-4">
                <p className="text-xs text-p-faint">{tr("Payments")}</p>
                <p className="mt-1 font-semibold tabular-nums">{open.count}</p>
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold">{tr("Payment history")}</p>
              <ul className="divide-y divide-p-line rounded-xl border border-p-line">
                {payments.filter((p) => p.phone === open.phone).length === 0 && (
                  <li className="px-4 py-3 text-sm text-p-muted">
                    {open.count} {tr("successful of")} {open.attempts} {tr("payments · last on")} {date(open.last)}
                  </li>
                )}
                {payments
                  .filter((p) => p.phone === open.phone)
                  .map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                      <span>
                        <span className="block font-medium tabular-nums">{money(p.amount, p.currency)}</span>
                        <span className="block text-xs text-p-faint">{date(p.createdAt)}</span>
                      </span>
                      <Status s={p.status} />
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        )}
      </Drawer>
    </>
  );
}
