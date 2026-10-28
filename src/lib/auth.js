import { create } from "zustand";

const KEY = "idicorp_token";
const read = () => {
  try { return sessionStorage.getItem(KEY); } catch { return null; }
};

export const useAuth = create((set) => ({
  token: read(),
  notice: "",
  login: (token) => {
    try { sessionStorage.setItem(KEY, token); } catch { /* storage unavailable */ }
    set({ token, notice: "" });
  },
  logout: (notice = "") => {
    try { sessionStorage.removeItem(KEY); } catch { /* storage unavailable */ }
    set({ token: null, notice });
  },
}));
