import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, X, UserRound, Sparkles } from "lucide-react";
import { api } from "../api";

type Msg = { id: string; role: "merchant" | "assistant" | "staff"; author: string | null; content: string; at: string };

/** Floating help chat for merchants: the WisoPay assistant answers; staff replies show here too. */
export function SupportChat() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [conv, setConv] = useState<string | null>(null);
  const [ticket, setTicket] = useState<{ id: string; status: string } | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [supported, setSupported] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);

  // Load the chat once the panel is first opened, then refresh while it is open (staff may reply)
  useEffect(() => {
    if (!open) return;
    let alive = true;
    const load = () =>
      api.supportHistory(conv).then((r: any) => {
        if (!alive) return;
        setSupported(r.supported !== false);
        setMsgs(r.messages ?? []);
        setTicket(r.ticket ?? null);
        if (r.conversation_id) setConv(r.conversation_id);
      }).catch(() => {});
    void load();
    const t = setInterval(load, 15_000);
    return () => { alive = false; clearInterval(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [msgs.length, open]);

  const send = async (message: string) => {
    const m = message.trim();
    if (!m || busy) return;
    setBusy(true);
    setError("");
    setText("");
    setMsgs((x) => [...x, { id: `local-${Date.now()}`, role: "merchant", author: null, content: m, at: new Date().toISOString() }]);
    try {
      const r: any = await api.supportChat({ conversation_id: conv, message: m });
      setConv(r.conversation_id);
      setMsgs(r.messages ?? []);
      if (r.ticket_id) setTicket({ id: r.ticket_id, status: "open" });
    } catch (e: any) {
      setError(e?.message ?? "Couldn't send. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const askForPerson = () => send("I'd like to talk to a person, please.");

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Get help"
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-p-accent px-4 py-3 text-sm font-semibold text-p-accent-ink shadow-lg transition hover:brightness-95"
        >
          <MessageCircle className="h-4 w-4" /> Help
        </button>
      )}
      {open && (
        <section className="fixed bottom-4 right-4 z-40 flex h-[min(560px,calc(100vh-2rem))] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-p-line bg-p-panel shadow-2xl">
          <header className="flex items-center justify-between border-b border-p-line px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-p-fg">WisoPay help</p>
              <p className="text-xs text-p-muted">
                {ticket ? `Ticket ${ticket.id} · ${ticket.status === "solved" ? "solved" : "a team member will reply here"}` : "Ask about payments, refunds, payouts or your account"}
              </p>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close help" className="grid h-8 w-8 place-items-center rounded-lg text-p-faint hover:bg-p-panel2 hover:text-p-fg"><X className="h-4 w-4" /></button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {!supported && <p className="rounded-xl bg-p-panel2 px-3 py-2 text-sm text-p-muted">The assistant isn’t switched on yet. Email support@wisopay.io.</p>}
            {msgs.length === 0 && supported && (
              <div className="space-y-2 text-sm text-p-muted">
                <p>Hi! I can help with payments, refunds, withdrawals, payouts, statements and your account.</p>
                <p>For anything about a specific payment, include its ID (starts with TXN- or pay_).</p>
              </div>
            )}
            {msgs.map((m) => (
              <div key={m.id} className={m.role === "merchant" ? "flex justify-end" : "flex justify-start"}>
                <div className={`max-w-[85%] whitespace-pre-line rounded-2xl px-3.5 py-2 text-sm ${m.role === "merchant" ? "bg-p-accent text-p-accent-ink" : m.role === "staff" ? "border border-p-good/40 bg-p-good/10 text-p-fg" : "bg-p-panel2 text-p-fg"}`}>
                  {m.role === "staff" && <p className="mb-0.5 flex items-center gap-1 text-[11px] font-semibold text-p-good"><UserRound className="h-3 w-3" /> {m.author ?? "WisoPay support"}</p>}
                  {m.role === "assistant" && <p className="mb-0.5 flex items-center gap-1 text-[11px] font-semibold text-p-muted"><Sparkles className="h-3 w-3" /> Assistant</p>}
                  {m.content}
                </div>
              </div>
            ))}
            {busy && <p className="text-xs text-p-faint">Typing…</p>}
            {error && <p className="rounded-xl border border-p-bad/30 bg-p-bad/10 px-3 py-2 text-sm text-p-bad">{error}</p>}
            <div ref={endRef} />
          </div>

          <footer className="space-y-2 border-t border-p-line px-3 py-3">
            {supported && !ticket && msgs.length > 0 && (
              <button onClick={askForPerson} disabled={busy} className="text-xs font-medium text-p-muted underline underline-offset-2 hover:text-p-fg disabled:opacity-50">Talk to a person</button>
            )}
            <form onSubmit={(e) => { e.preventDefault(); void send(text); }} className="flex items-end gap-2">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(text); } }}
                maxLength={2000}
                rows={1}
                placeholder="Type your question…"
                disabled={!supported}
                className="max-h-28 flex-1 resize-none rounded-xl border border-p-line bg-transparent px-3 py-2 text-sm text-p-fg placeholder:text-p-faint focus:outline-none"
              />
              <button type="submit" disabled={busy || !text.trim() || !supported} aria-label="Send" className="grid h-9 w-9 place-items-center rounded-xl bg-p-accent text-p-accent-ink disabled:opacity-40">
                <Send className="h-4 w-4" />
              </button>
            </form>
          </footer>
        </section>
      )}
    </>
  );
}
