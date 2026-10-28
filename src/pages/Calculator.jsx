import { useEffect, useRef, useState } from "react";
import { useAuth } from "../lib/auth";
import { wsUrl } from "../lib/api";
import { useSocket } from "../lib/useSocket";
import { Alert, Button, Card, ConnectionBar, Field, inputCls } from "../ui";

const OPS = { add: ["Add", "+"], subtract: ["Subtract", "−"], multiply: ["Multiply", "×"], divide: ["Divide", "÷"] };
const NUM = /^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i;
const MAX = 1_000_000_000_000;

function parse(input, op) {
  const parts = input.split(/[\s,;]+/).filter(Boolean);
  if (!parts.length) return { error: "Enter at least one number." };
  if (parts.length > 100) return { error: "Enter at most 100 numbers." };
  const nums = [];
  for (const p of parts) {
    if (!NUM.test(p)) return { error: `"${p}" is not a valid number.` };
    const n = Number(p);
    if (!Number.isFinite(n) || Math.abs(n) > MAX) return { error: `"${p}" is too large. The limit is 1,000,000,000,000.` };
    nums.push(n);
  }
  if (op === "divide" && nums.slice(1).some((n) => n === 0)) return { error: "Division by zero is not allowed." };
  return { nums };
}

export default function Calculator() {
  const token = useAuth((s) => s.token);
  const pending = useRef([]);
  const idRef = useRef(0);
  const [op, setOp] = useState("add");
  const [input, setInput] = useState("");
  const [formError, setFormError] = useState("");
  const [history, setHistory] = useState([]);

  const { status, error, connect, disconnect, send } = useSocket({
    url: wsUrl("/ws/calculator"),
    authToken: token,
    onMessage: (_raw, msg) => {
      const req = pending.current.shift();
      if (!req) return;
      const entry = msg && msg.result !== undefined
        ? { ...req, result: msg.result }
        : { ...req, error: msg?.error === "Invalid calculator request" ? "The service rejected this request as invalid." : msg?.error || "Unexpected response from the service." };
      setHistory((h) => [entry, ...h].slice(0, 20));
    },
  });

  useEffect(() => { pending.current = []; connect(); }, [connect]);

  const submit = (e) => {
    e.preventDefault();
    const r = parse(input, op);
    if (r.error) return setFormError(r.error);
    if (!send({ operation: op, numbers: r.nums })) return setFormError("Not connected. Reconnect and try again.");
    setFormError("");
    pending.current.push({ id: ++idRef.current, op, nums: r.nums });
  };

  return (
    <div className="space-y-6">
      <Card aria-labelledby="calc-title">
        <h2 id="calc-title" className="mb-4 text-lg font-semibold">Calculator</h2>
        <ConnectionBar status={status} error={error} onConnect={connect} onDisconnect={disconnect} />
        <form onSubmit={submit} className="mt-4 space-y-3" noValidate>
          <Field label="Operation" id="calc-op">
            <select id="calc-op" className={inputCls} value={op} onChange={(e) => setOp(e.target.value)}>
              {Object.entries(OPS).map(([k, [name, sym]]) => <option key={k} value={k}>{name} ({sym})</option>)}
            </select>
          </Field>
          <Field label="Numbers" id="calc-nums" hint="Separate with spaces or commas. 1 to 100 numbers.">
            <input id="calc-nums" className={inputCls} inputMode="decimal" value={input} onChange={(e) => setInput(e.target.value)} placeholder="10 20" />
          </Field>
          <Alert>{formError}</Alert>
          <Button type="submit" disabled={status !== "ready"}>Calculate</Button>
        </form>
      </Card>

      <Card aria-labelledby="calc-history">
        <h2 id="calc-history" className="mb-3 text-lg font-semibold">Results</h2>
        {history.length === 0 ? (
          <p className="text-slate-600">Results appear here.</p>
        ) : (
          <ul className="space-y-2" aria-live="polite">
            {history.map((h) => (
              <li key={h.id} className="break-words rounded-md border border-slate-200 p-3 text-sm">
                <span className="text-slate-600">{OPS[h.op][0]}: {h.nums.join(` ${OPS[h.op][1]} `)}</span>
                <br />
                {h.error ? <span className="text-red-700">{h.error}</span> : <strong className="text-base">= {String(h.result)}</strong>}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
