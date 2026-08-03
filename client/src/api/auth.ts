import { withAuth } from "./donations";

const BASE = "/api";

// this tells the server a login just happened, for the access log.
export async function logLogin(): Promise<void> {
  try {
    await withAuth(`${BASE}/auth/log-login`, { method: "POST" });
  } catch (err) {
    console.error("Failed to log login:", err);
  }
}