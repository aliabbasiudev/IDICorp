import { useRef, useState } from "react";
import { apiRequest } from "../lib/api";
import { Alert, Button, Card, Field, inputCls } from "../ui";

export default function Stream() {
  const abort = useRef(null);
  const [text, setText] = useState("");
  const [out, setOut] = useState("");
  const [state, setState] = useState("idle"); // idle | streaming | done | cancelled | error
  const [error, setError] = useState("");
  const [type, setType] = useState("");

  const run = async (e) => {
    e.preventDefault();
    if (!text) return;
    abort.current = new AbortController();
    setOut(""); setError(""); setType(""); setState("streaming");
    try {
      const res = await apiRequest("/api/echo/stream", {
        method: "POST", body: text, contentType: "text/plain; charset=utf-8", signal: abort.current.signal, stream: true,
      });
      setType(res.headers.get("content-type") || "");
      if (!res.body) {
        setOut(await res.text());
      } else {
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          setOut((o) => o + dec.decode(value, { stream: true }));
        }
        setOut((o) => o + dec.decode());
      }
      setState("done");
    } catch (err) {
      if (err.name === "AbortError") return setState("cancelled");
      setError(err.message || "The stream failed.");
      setState("error");
    }
  };

  const label = { idle: "", streaming: "Streaming…", done: "Finished.", cancelled: "Cancelled.", error: "" }[state];

  return (
    <Card aria-labelledby="stream-title" className="space-y-4">
      <h2 id="stream-title" className="text-lg font-semibold">Streaming echo</h2>
      <form onSubmit={run} className="space-y-3">
        <Field label="Content to send" id="stream-in">
          <textarea id="stream-in" rows={4} className={inputCls} value={text} onChange={(e) => setText(e.target.value)} />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={state === "streaming" || !text}>Send</Button>
          <Button type="button" variant="ghost" disabled={state !== "streaming"} onClick={() => abort.current?.abort()}>Cancel</Button>
        </div>
      </form>
      <Alert>{error}</Alert>
      <div>
        <h3 className="mb-1 text-sm font-medium">
          Returned content <span className="font-normal text-slate-600" role="status">{label}</span>
        </h3>
        <pre aria-live="polite" className="min-h-24 overflow-x-auto whitespace-pre-wrap break-words rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
          {out || (state === "idle" ? "The returned content appears here." : "")}
        </pre>
        {type && <p className="mt-1 text-xs text-slate-600">Content type: {type}</p>}
      </div>
    </Card>
  );
}
