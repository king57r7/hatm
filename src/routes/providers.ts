import { Router } from "express";
import { db, apiProviderConfigsTable } from "../db.js";
import { eq } from "drizzle-orm";
import { getSession } from "../lib/session.js";
import { fetchProviderServices, getProviderBalance } from "../lib/provider.js";

const router = Router();

async function requireAdmin(req: any, res: any) {
  const session = await getSession(req, res);
  if (!session.userId || session.role !== "ADMIN") { res.status(401).json({ error: "Unauthorized" }); return null; }
  return session;
}

router.get("/api/providers", async (req, res) => {
  try {
    if (!await requireAdmin(req, res)) return;
    const providers = await db.select().from(apiProviderConfigsTable).orderBy(apiProviderConfigsTable.createdAt);
    return res.json({ providers });
  } catch { return res.status(500).json({ error: "Internal server error" }); }
});

router.post("/api/providers", async (req, res) => {
  try {
    if (!await requireAdmin(req, res)) return;
    const { name, apiKey, baseUrl } = req.body;
    if (!name || !apiKey || !baseUrl) return res.status(400).json({ error: "All fields required" });
    const [provider] = await db.insert(apiProviderConfigsTable).values({ name, apiKey, baseUrl }).returning();
    return res.json({ provider, success: true });
  } catch { return res.status(500).json({ error: "Internal server error" }); }
});

router.patch("/api/providers/:id", async (req, res) => {
  try {
    if (!await requireAdmin(req, res)) return;
    const { name, apiKey, baseUrl, isActive } = req.body;
    const u: any = { updatedAt: new Date() };
    if (name !== undefined) u.name = name;
    if (apiKey !== undefined) u.apiKey = apiKey;
    if (baseUrl !== undefined) u.baseUrl = baseUrl;
    if (isActive !== undefined) u.isActive = isActive;
    const [provider] = await db.update(apiProviderConfigsTable).set(u).where(eq(apiProviderConfigsTable.id, req.params.id)).returning();
    return res.json({ provider, success: true });
  } catch { return res.status(500).json({ error: "Internal server error" }); }
});

router.delete("/api/providers/:id", async (req, res) => {
  try {
    if (!await requireAdmin(req, res)) return;
    await db.delete(apiProviderConfigsTable).where(eq(apiProviderConfigsTable.id, req.params.id));
    return res.json({ success: true });
  } catch { return res.status(500).json({ error: "Internal server error" }); }
});

router.get("/api/providers/:id/services", async (req, res) => {
  try {
    if (!await requireAdmin(req, res)) return;
    const services = await fetchProviderServices(req.params.id);
    return res.json({ services });
  } catch { return res.status(500).json({ error: "Internal server error" }); }
});

router.get("/api/providers/:id/balance", async (req, res) => {
  try {
    if (!await requireAdmin(req, res)) return;
    const balance = await getProviderBalance(req.params.id);
    return res.json({ balance });
  } catch { return res.status(500).json({ error: "Internal server error" }); }
});

export default router;
