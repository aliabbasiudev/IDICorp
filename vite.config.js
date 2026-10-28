import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const target = env.VITE_PROXY_TARGET || "https://ts.idicorp.ir";

  const proxy = {
    "/api": {
      target,
      changeOrigin: true,
      secure: true,
      cookieDomainRewrite: "",
    },
    "/ws": {
      target: target.replace(/^http/, "ws"),
      changeOrigin: true,
      ws: true,
      secure: true,
      configure: (p) => {
        // Some servers reject WebSocket handshakes whose Origin is localhost.
        p.on("proxyReqWs", (req) => req.setHeader("origin", target));
        p.on("error", (err) => console.log("[ws proxy error]", err.message));
      },
    },
  };

  return {
    plugins: [react(), tailwindcss()],
    server: { proxy },
    preview: { proxy },
  };
});