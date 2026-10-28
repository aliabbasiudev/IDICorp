import { useCallback, useEffect, useRef, useState } from "react";

function detach(ws) {
  if (!ws) return;
  ws.onopen = ws.onmessage = ws.onerror = ws.onclose = null;
  try { ws.close(1000); } catch { /* already closed */ }
}

// status: idle | connecting | ready | closed | error
// If authToken is given it is sent as the first message ({"token": ...}) right after the socket opens.
export function useSocket({ url, authToken, onMessage }) {
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const wsRef = useRef(null);
  const handler = useRef(onMessage);
  handler.current = onMessage;

  const disconnect = useCallback(() => {
    detach(wsRef.current);
    wsRef.current = null;
    setStatus("closed");
  }, []);

  const connect = useCallback(() => {
    detach(wsRef.current);
    setError("");
    setStatus("connecting");
    let ws;
    try { ws = new WebSocket(url); } catch {
      setStatus("error");
      setError("Invalid WebSocket address.");
      return;
    }
    wsRef.current = ws;
    let ready = false;
    ws.onopen = () => { if (authToken) ws.send(JSON.stringify({ token: authToken })); };
    ws.onmessage = (ev) => {
      let parsed = null;
      if (typeof ev.data === "string") { try { parsed = JSON.parse(ev.data); } catch { /* plain text */ } }
      if (!ready && parsed?.type === "ready") { ready = true; setStatus("ready"); return; }
      if (!ready && parsed?.error) {
        setError(parsed.error === "Unauthorized" ? "The server rejected your token. Sign out and sign in again." : parsed.error);
        setStatus("error");
        return;
      }
      handler.current?.(ev.data, parsed);
    };
    ws.onerror = () => setError("Connection error. Check that the service is reachable.");
    ws.onclose = () => {
      if (wsRef.current === ws) wsRef.current = null;
      setStatus((s) => (s === "error" ? s : "closed"));
    };
  }, [url, authToken]);

  const send = useCallback((payload) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    ws.send(typeof payload === "string" ? payload : JSON.stringify(payload));
    return true;
  }, []);

  useEffect(() => () => { detach(wsRef.current); wsRef.current = null; }, []);

  return { status, error, connect, disconnect, send };
}
