import { Router } from "express";
import type { Request, Response } from "express";
import { getResearcherId, logAccess } from "../lib/auth";

const router = Router();

// POST /api/auth/log-login
// This is called by the client right after supabase.auth.signInWithPassword succeeds.
// We re-verify the token server-side before writing, so a client can't forge a login 
// entry for someone else's researcher_id.
router.post("/log-login", async (req: Request, res: Response) => {
  try {
    const researcherId = await getResearcherId(req);
    if (!researcherId) return res.status(403).json({ error: "Access denied" });

    await logAccess(researcherId, "login", null, null);
    res.json({ ok: true });
  } catch (err) {
    // Log the error and return a 500 response with the error message
    console.error("POST /auth/log-login failed:", err);
    res.status(500).json({ error: err instanceof Error ? err.message : "Unknown server error" });
  }
});

export default router;