import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import { useAuth } from "./lib/auth";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: (n, e) => !(e?.status >= 400 && e.status < 500) && n < 1 },
  },
});

// Drop cached data when the user signs out.
useAuth.subscribe((s, p) => {
  if (p.token && !s.token) queryClient.clear();
});

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
