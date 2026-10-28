import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "./lib/api";
import { useAuth } from "./lib/auth";
import { Alert, Button, Card, Field, inputCls } from "./ui";
import Tasks from "./pages/Tasks";
import Calculator from "./pages/Calculator";
import Echo from "./pages/Echo";
import Stream from "./pages/Stream";

function Login() {
  const notice = useAuth((s) => s.notice);
  const login = useAuth((s) => s.login);
  const [f, setF] = useState({ username: "", password: "", captcha_answer: "" });
  const on = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const cap = useQuery({
    queryKey: ["captcha"],
    queryFn: () => apiRequest("/api/auth/login", { auth: false }),
    gcTime: 0, staleTime: 0, retry: false, refetchOnWindowFocus: false,
  });
  const m = useMutation({
    mutationFn: () => apiRequest("/api/auth/login", { method: "POST", auth: false, json: { ...f, salt: cap.data.salt } }),
    onSuccess: (d) => login(d.access_token),
    onError: () => { setF((x) => ({ ...x, captcha_answer: "" })); cap.refetch(); }, // CAPTCHA and salt are single-use
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-4 py-8">
      <Card className="w-full">
        <h1 className="text-2xl font-semibold">IDICorp Service Console</h1>
        <p className="mb-5 mt-1 text-sm text-slate-600">Sign in to manage tasks and try the service tools.</p>
        <form onSubmit={(e) => { e.preventDefault(); m.mutate(); }} className="space-y-4">
          <Alert tone="info">{notice}</Alert>
          <Field label="Username" id="login-user">
            <input id="login-user" className={inputCls} autoComplete="username" required value={f.username} onChange={on("username")} />
          </Field>
          <Field label="Password" id="login-pass">
            <input id="login-pass" type="password" className={inputCls} autoComplete="current-password" required value={f.password} onChange={on("password")} />
          </Field>
          <div className="space-y-2">
            {cap.isError ? (
              <Alert>{cap.error.message}</Alert>
            ) : cap.data?.captcha ? (
              <img src={cap.data.captcha} alt="CAPTCHA: type the characters you see" className="h-16 max-w-full rounded border border-slate-300 bg-white" />
            ) : (
              <p className="text-sm text-slate-600" aria-busy="true">Loading CAPTCHA…</p>
            )}
            <Button type="button" variant="ghost" onClick={() => cap.refetch()} disabled={cap.isFetching}>New CAPTCHA</Button>
          </div>
          <Field label="CAPTCHA characters" id="login-captcha">
            <input id="login-captcha" className={inputCls} autoComplete="off" required value={f.captcha_answer} onChange={on("captcha_answer")} />
          </Field>
          <Alert>{m.error?.message}</Alert>
          <Button type="submit" className="w-full" disabled={m.isPending || !cap.data?.salt}>{m.isPending ? "Signing in…" : "Sign in"}</Button>
        </form>
      </Card>
    </main>
  );
}

const TABS = [
  ["tasks", "Tasks", Tasks],
  ["calc", "Calculator", Calculator],
  ["echo", "Text echo", Echo],
  ["stream", "Streaming echo", Stream],
];

function Shell() {
  const logout = useAuth((s) => s.logout);
  const [tab, setTab] = useState("tasks");
  const Page = TABS.find((t) => t[0] === tab)[2];
  return (
    <>
      <a href="#main" className="sr-only rounded bg-white px-3 py-2 focus:not-sr-only focus:absolute focus:left-2 focus:top-2">Skip to content</a>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <h1 className="text-lg font-semibold">IDICorp Service Console</h1>
          <Button variant="ghost" onClick={() => logout()}>Sign out</Button>
        </div>
        <nav aria-label="Main" className="mx-auto max-w-4xl overflow-x-auto px-4">
          <ul className="flex gap-1">
            {TABS.map(([id, label]) => (
              <li key={id}>
                <button
                  onClick={() => setTab(id)}
                  aria-current={tab === id ? "page" : undefined}
                  className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium ${tab === id ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-600 hover:text-slate-900"}`}
                >
                  {label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main id="main" className="mx-auto max-w-4xl px-4 py-6">
        <Page />
      </main>
    </>
  );
}

export default function App() {
  const token = useAuth((s) => s.token);
  return token ? <Shell /> : <Login />;
}
