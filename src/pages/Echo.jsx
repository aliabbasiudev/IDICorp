import { useEffect, useRef, useState } from "react";
import { wsUrl } from "../lib/api";
import { useSocket } from "../lib/useSocket";
import { Button, Card, ConnectionBar, Field, inputCls } from "../ui";

export default function Echo() {
  const idRef = useRef(0);
  const endRef = useRef(null);
  const [text, setText] = useState("");
  const [log, setLog] = useState([]);
  const add = (dir, body) => setLog((l) => [...l, { id: ++idRef.current, dir, body }]);

  const { status, error, connect, disconnect, send } = useSocket({
    url: wsUrl("/ws/echo"),
    onMessage: (raw) => add("echo", typeof raw === "string" ? raw : "[binary data]"),
  });

  useEffect(() => { connect(); }, [connect]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "nearest" }); }, [log]);

  const submit = (e) => {
    e.preventDefault();
    if (!text || !send(text)) return;
    add("sent", text);
    setText("");
  };

  return (
    <Card aria-labelledby="echo-title" className="space-y-4">
      <h2 id="echo-title" className="text-lg font-semibold">Text echo</h2>
      <ConnectionBar status={status} error={error} onConnect={connect} onDisconnect={disconnect} />
      <ul role="log" aria-live="polite" aria-label="Messages" className="max-h-80 min-h-32 space-y-2 overflow-y-auto rounded-md border border-slate-200 bg-slate-50 p-3">
        {log.length === 0 && <li className="text-sm text-slate-600">Send a message to see it echoed back.</li>}
        {log.map((m) => (
          <li key={m.id} className={`flex ${m.dir === "sent" ? "justify-end" : "justify-start"}`}>
            <span className={`max-w-[85%] whitespace-pre-wrap break-words rounded-lg px-3 py-2 text-sm ${m.dir === "sent" ? "bg-indigo-600 text-white" : "border border-slate-300 bg-white"}`}>
              <span className="sr-only">{m.dir === "sent" ? "You sent: " : "Echo: "}</span>
              {m.body}
            </span>
          </li>
        ))}
        <li ref={endRef} aria-hidden="true" />
      </ul>
      <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Field label="Message" id="echo-msg">
            <input id="echo-msg" className={inputCls} value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" />
          </Field>
        </div>
        <Button type="submit" disabled={status !== "ready" || !text}>Send</Button>
        <Button type="button" variant="ghost" onClick={() => setLog([])} disabled={!log.length}>Clear</Button>
      </form>
    </Card>
  );
}
