# IDICorp Service Console

Responsive React client for the IDICorp API challenge: sign-in with CAPTCHA, task management, calculator (WebSocket), text echo (WebSocket) and streaming echo.

Stack: React 18, Vite 6, Tailwind CSS 4, TanStack React Query 5, Zustand 5.

## Requirements

- Node.js 18.18 or newer (20 or 22 recommended) and npm
- Network access to the API (default `https://ts.idicorp.ir`)

## Run locally

```bash
npm install
cp .env.example .env        # PowerShell: Copy-Item .env.example .env
npm run dev                 # http://localhost:5173
```

Production build and local preview:

```bash
npm run build
npm run preview
```

## Configuration (`.env`)

| Variable | Purpose |
| --- | --- |
| `VITE_PROXY_TARGET` | API origin the Vite dev/preview proxy forwards `/api` and `/ws` to. Default `https://ts.idicorp.ir`. Set it to your environment's URL (for example a local mock). |
| `VITE_API_BASE_URL` | Leave empty (recommended). If set, the browser calls this origin directly and the server must allow CORS with credentials. |
| `VITE_WS_BASE_URL` | Leave empty (recommended). If set (for example `wss://ts.idicorp.ir`), WebSockets connect there directly. |

Restart `npm run dev` after changing `.env`.

## Assumptions about the service

- The API sets HTTP-only `session` and `task_session` cookies at sign-in. Every API request is sent with credentials and the Bearer token. The proxy makes the browser treat the API as same-origin so the cookies are stored and sent.
- `GET /api/tasks` returns a JSON array. Timestamps without a timezone are treated as UTC.
- Task expiry is shown as one hour after `updated_at` (or `created_at`). The server stays authoritative.
- CAPTCHA and `salt` are single use, so a new one is loaded after every failed sign-in.
- The calculator socket receives the token as its first message immediately after connecting. The echo socket needs no token.
- The access token is kept in `sessionStorage` and removed on sign out or on a `401`.
- The proxy is development tooling only. The built app is static and needs a host that proxies `/api` and `/ws`, or the two base-URL variables with CORS enabled.
