export const inputCls =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base disabled:bg-slate-100 disabled:text-slate-500";

export function Button({ variant = "primary", className = "", ...p }) {
  const v = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700",
    ghost: "border border-slate-300 bg-white hover:bg-slate-100",
    danger: "bg-red-600 text-white hover:bg-red-700",
  }[variant];
  return (
    <button
      className={`inline-flex min-h-10 items-center justify-center rounded-md px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 ${v} ${className}`}
      {...p}
    />
  );
}

export function Field({ label, id, hint, children }) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium">{label}</label>
      {children}
      {hint && <p className="text-xs text-slate-600">{hint}</p>}
    </div>
  );
}

export function Alert({ tone = "error", children }) {
  if (!children) return null;
  const c = tone === "error" ? "border-red-300 bg-red-50 text-red-800" : "border-sky-300 bg-sky-50 text-sky-900";
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`rounded-md border px-3 py-2 text-sm ${c}`}>
      {children}
    </div>
  );
}

export const Card = ({ className = "", ...p }) => (
  <section className={`rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-6 ${className}`} {...p} />
);

const STATES = {
  idle: ["Idle", "bg-slate-200 text-slate-800"],
  connecting: ["Connecting…", "bg-amber-200 text-amber-900"],
  ready: ["Connected", "bg-green-200 text-green-900"],
  closed: ["Disconnected", "bg-slate-200 text-slate-800"],
  error: ["Connection error", "bg-red-200 text-red-900"],
};
export function ConnectionBar({ status, error, onConnect, onDisconnect }) {
  const [label, cls] = STATES[status];
  const live = status === "ready" || status === "connecting";
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <span role="status" className={`rounded-full px-3 py-1 text-xs font-medium ${cls}`}>{label}</span>
        {live ? (
          <Button variant="ghost" onClick={onDisconnect}>Disconnect</Button>
        ) : (
          <Button variant="ghost" onClick={onConnect}>Reconnect</Button>
        )}
      </div>
      <Alert>{error}</Alert>
    </div>
  );
}
