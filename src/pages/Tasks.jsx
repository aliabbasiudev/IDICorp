import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../lib/api";
import { Alert, Button, Card, Field, inputCls } from "../ui";

const TTL = 60 * 60 * 1000; // tasks expire one hour after their last change

function parseTime(v) {
  if (typeof v === "number") return v < 1e12 ? v * 1000 : v;
  if (!v) return NaN;
  // Timestamps without a timezone are assumed to be UTC.
  return Date.parse(/(Z|[+-]\d{2}:?\d{2})$/i.test(v) ? v : `${v}Z`);
}

function useNow(ms = 30000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

function useDebounced(value, ms = 300) {
  const [d, setD] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setD(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return d;
}

function TaskForm({ id, initial, onSubmit, onCancel, pending, error, label }) {
  const [v, setV] = useState({ title: initial.title, description: initial.description || "", completed: !!initial.completed });
  const [err, setErr] = useState("");
  const submit = (e) => {
    e.preventDefault();
    const title = v.title.trim();
    if (!title) return setErr("Title is required.");
    setErr("");
    onSubmit({ ...v, title });
  };
  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      <Field label="Title" id={`${id}-title`} hint={`${v.title.length}/120 characters`}>
        <input id={`${id}-title`} className={inputCls} maxLength={120} value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} />
      </Field>
      <Field label="Description (optional)" id={`${id}-desc`} hint={`${v.description.length}/2000 characters`}>
        <textarea id={`${id}-desc`} className={inputCls} rows={3} maxLength={2000} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" className="size-4" checked={v.completed} onChange={(e) => setV({ ...v, completed: e.target.checked })} />
        Completed
      </label>
      <Alert>{err || error}</Alert>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : label}</Button>
        {onCancel && <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>}
      </div>
    </form>
  );
}

function TaskItem({ task, now }) {
  const qc = useQueryClient();
  const [mode, setMode] = useState("view"); // view | edit | delete
  const refresh = () => qc.invalidateQueries({ queryKey: ["tasks"] });
  const url = `/api/tasks/${task.id}`;
  const put = useMutation({ mutationFn: (json) => apiRequest(url, { method: "PUT", json }), onSettled: refresh });
  const patch = useMutation({ mutationFn: (json) => apiRequest(url, { method: "PATCH", json }), onSettled: refresh });
  const del = useMutation({ mutationFn: () => apiRequest(url, { method: "DELETE" }), onSettled: refresh });

  const exp = parseTime(task.updated_at ?? task.created_at) + TTL;
  const left = exp - now;
  const expiry = Number.isNaN(exp) ? "" : left <= 0 ? "Expired. Refresh the list." : `Expires in ${Math.ceil(left / 60000)} min`;

  if (mode === "edit") {
    return (
      <li className="rounded-md border border-indigo-200 bg-indigo-50/40 p-4">
        <TaskForm
          id={`edit-${task.id}`}
          initial={task}
          label="Save changes"
          pending={put.isPending}
          error={put.error?.message}
          onCancel={() => setMode("view")}
          onSubmit={(v) => put.mutateAsync(v).then(() => setMode("view")).catch(() => {})}
        />
      </li>
    );
  }

  return (
    <li className="rounded-md border border-slate-200 p-4">
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          className="mt-1 size-5 shrink-0"
          checked={!!task.completed}
          disabled={patch.isPending}
          onChange={() => patch.mutate({ completed: !task.completed })}
          aria-label={`Mark "${task.title}" as ${task.completed ? "not completed" : "completed"}`}
        />
        <div className="min-w-0 flex-1">
          <h3 className={`break-words font-medium ${task.completed ? "text-slate-500 line-through" : ""}`}>{task.title}</h3>
          {task.description && <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-700">{task.description}</p>}
          <p className="mt-2 text-xs text-slate-600">
            {expiry}
            {task.updated_at && !Number.isNaN(parseTime(task.updated_at)) && ` · Updated ${new Date(parseTime(task.updated_at)).toLocaleString()}`}
          </p>
        </div>
      </div>
      <div className="mt-3 space-y-2">
        <Alert>{patch.error?.message || del.error?.message}</Alert>
        {mode === "delete" ? (
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Confirm deletion">
            <span className="text-sm">Delete this task?</span>
            <Button variant="danger" disabled={del.isPending} onClick={() => del.mutate()}>{del.isPending ? "Deleting…" : "Delete"}</Button>
            <Button variant="ghost" onClick={() => setMode("view")}>Keep</Button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => setMode("edit")} aria-label={`Edit "${task.title}"`}>Edit</Button>
            <Button variant="ghost" onClick={() => setMode("delete")} aria-label={`Delete "${task.title}"`}>Delete</Button>
          </div>
        )}
      </div>
    </li>
  );
}

export default function Tasks() {
  const qc = useQueryClient();
  const now = useNow();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("");
  const [formKey, setFormKey] = useState(0);
  const dq = useDebounced(q.trim());

  const params = new URLSearchParams();
  if (dq) params.set("q", dq);
  if (filter) params.set("completed", filter);
  const qs = params.toString();

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ["tasks", dq, filter],
    queryFn: () => apiRequest(`/api/tasks${qs ? `?${qs}` : ""}`),
  });
  const create = useMutation({
    mutationFn: (json) => apiRequest("/api/tasks", { method: "POST", json }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const tasks = Array.isArray(data) ? data : [];
  const badShape = data !== undefined && !Array.isArray(data);

  return (
    <div className="space-y-6">
      <Card aria-labelledby="new-task">
        <h2 id="new-task" className="mb-4 text-lg font-semibold">New task</h2>
        <TaskForm
          key={formKey}
          id="new"
          initial={{ title: "", description: "", completed: false }}
          label="Add task"
          pending={create.isPending}
          error={create.error?.message}
          onSubmit={(v) => create.mutateAsync(v).then(() => setFormKey((k) => k + 1)).catch(() => {})}
        />
      </Card>

      <Card aria-labelledby="task-list">
        <h2 id="task-list" className="mb-4 text-lg font-semibold">Your tasks</h2>
        <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_12rem]">
          <Field label="Search titles and descriptions" id="task-search">
            <input id="task-search" type="search" className={inputCls} value={q} onChange={(e) => setQ(e.target.value)} />
          </Field>
          <Field label="Show" id="task-filter">
            <select id="task-filter" className={inputCls} value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="">All tasks</option>
              <option value="false">Open</option>
              <option value="true">Completed</option>
            </select>
          </Field>
        </div>

        <p className="mb-3 text-xs text-slate-600">
          Tasks expire one hour after their last change.{" "}
          <button className="underline" onClick={() => refetch()} disabled={isFetching}>{isFetching ? "Refreshing…" : "Refresh"}</button>
        </p>

        {isLoading ? (
          <p aria-busy="true" className="py-6 text-center text-slate-600">Loading tasks…</p>
        ) : error ? (
          <div className="space-y-3">
            <Alert>{error.message}</Alert>
            <Button variant="ghost" onClick={() => refetch()}>Try again</Button>
          </div>
        ) : badShape ? (
          <Alert>The server returned an unexpected response for the task list.</Alert>
        ) : tasks.length === 0 ? (
          <p className="py-6 text-center text-slate-600">
            {dq || filter ? "No tasks match your search or filter." : "No tasks yet. Add your first task above."}
          </p>
        ) : (
          <ul className="space-y-3">{tasks.map((t) => <TaskItem key={t.id} task={t} now={now} />)}</ul>
        )}
      </Card>
    </div>
  );
}
