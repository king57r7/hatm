import { Router } from "express";
import { db, servicesTable, siteSettingsTable, apiProviderConfigsTable } from "../db.js";
import { eq, and, or, ilike } from "drizzle-orm";
import { getSession } from "../lib/session.js";
import { fetchProviderServices } from "../lib/provider.js";

const router = Router();

router.get("/api/services", async (req, res) => {
  try {
    const session = await getSession(req, res);
    if (!session.userId) return res.status(401).json({ error: "Unauthorized" });
    const adminView = req.query.admin === "true" && session.role === "ADMIN";
    const settingsRaw = await db.select().from(siteSettingsTable);
    const multiplier = parseFloat(Object.fromEntries(settingsRaw.map((s: any) => [s.key, s.value])).price_multiplier || "1");
    let conds: any[] = [];
    if (!adminView) { conds.push(eq(servicesTable.isActive, true)); conds.push(eq(servicesTable.isHidden, false)); }
    if (req.query.category) conds.push(eq(servicesTable.category, req.query.category as string));
    let services;
    if (req.query.search) {
      const sc = or(ilike(servicesTable.name, `%${req.query.search}%`), ilike(servicesTable.category, `%${req.query.search}%`));
      services = await db.select().from(servicesTable).where(conds.length ? and(...conds, sc) : sc);
    } else {
      services = conds.length ? await db.select().from(servicesTable).where(and(...conds)) : await db.select().from(servicesTable);
    }
    const categories = [...new Set(services.map((s: any) => s.category))].sort();
    return res.json({ services: services.map((s: any) => ({ ...s, displayPricePerK: s.basePricePerK * multiplier })), categories });
  } catch (err) { console.error(err); return res.status(500).json({ error: "Internal server error" }); }
});

router.patch("/api/services/:id", async (req, res) => {
  try {
    const session = await getSession(req, res);
    if (!session.userId || session.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    const [svc] = await db.select().from(servicesTable).where(eq(servicesTable.id, req.params.id)).limit(1);
    if (!svc) return res.status(404).json({ error: "Not found" });
    const b = req.body; const u: any = { updatedAt: new Date() };
    if (b.nameAr !== undefined) u.nameAr = b.nameAr;
    if (b.categoryAr !== undefined) u.categoryAr = b.categoryAr;
    if (b.isActive !== undefined) u.isActive = b.isActive;
    if (b.isHidden !== undefined) u.isHidden = b.isHidden;
    if (b.name !== undefined) u.name = b.name;
    if (b.markupPercent !== undefined) { u.markupPercent = b.markupPercent; u.finalPricePerK = svc.basePricePerK * (1 + b.markupPercent / 100); }
    const [updated] = await db.update(servicesTable).set(u).where(eq(servicesTable.id, req.params.id)).returning();
    return res.json({ service: updated });
  } catch (err) { console.error(err); return res.status(500).json({ error: "Internal server error" }); }
});

router.delete("/api/services/:id", async (req, res) => {
  try {
    const session = await getSession(req, res);
    if (!session.userId || session.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    await db.delete(servicesTable).where(eq(servicesTable.id, req.params.id));
    return res.json({ success: true });
  } catch (err) { console.error(err); return res.status(500).json({ error: "Internal server error" }); }
});

router.post("/api/services/add-by-id", async (req, res) => {
  try {
    const session = await getSession(req, res);
    if (!session.userId || session.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    const { providerServiceId, apiProviderConfigId } = req.body;
    if (!providerServiceId) return res.status(400).json({ error: "providerServiceId required" });
    const settingsRaw = await db.select().from(siteSettingsTable);
    const multiplier = parseFloat(Object.fromEntries(settingsRaw.map((s: any) => [s.key, s.value])).price_multiplier || "1");
    const all = await fetchProviderServices(apiProviderConfigId);
    const ps = all.find((s: any) => s.service === parseInt(providerServiceId));
    if (!ps) return res.status(404).json({ error: "Service not found from provider" });
    const base = parseFloat(ps.rate); const final = base * multiplier;
    const conds: any[] = [eq(servicesTable.providerId, ps.service)];
    if (apiProviderConfigId) conds.push(eq(servicesTable.apiProviderConfigId, apiProviderConfigId));
    const [existing] = await db.select().from(servicesTable).where(and(...conds)).limit(1);
    if (existing) {
      const [u] = await db.update(servicesTable).set({ name: ps.name, category: ps.category, min: parseInt(ps.min), max: parseInt(ps.max), basePricePerK: base, finalPricePerK: final, refill: ps.refill, cancel: ps.cancel, type: ps.type, isActive: true, updatedAt: new Date() }).where(eq(servicesTable.id, existing.id)).returning();
      return res.json({ service: u, success: true, action: "updated" });
    }
    const [svc] = await db.insert(servicesTable).values({ providerId: ps.service, apiProviderConfigId: apiProviderConfigId || null, name: ps.name, category: ps.category, min: parseInt(ps.min), max: parseInt(ps.max), basePricePerK: base, markupPercent: 0, finalPricePerK: final, refill: ps.refill, cancel: ps.cancel, type: ps.type }).returning();
    return res.json({ service: svc, success: true, action: "created" });
  } catch (err) { console.error(err); return res.status(500).json({ error: "Internal server error" }); }
});

router.post("/api/services/sync", async (req, res) => {
  try {
    const session = await getSession(req, res);
    if (!session.userId || session.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    const { apiProviderConfigId } = req.body;
    const settingsRaw = await db.select().from(siteSettingsTable);
    const multiplier = parseFloat(Object.fromEntries(settingsRaw.map((s: any) => [s.key, s.value])).price_multiplier || "1");
    const providerServices = await fetchProviderServices(apiProviderConfigId);
    if (!providerServices.length) return res.status(502).json({ error: "No services from provider" });
    let created = 0, updated = 0;
    for (const ps of providerServices as any[]) {
      const base = parseFloat(ps.rate); const final = base * multiplier;
      const conds: any[] = [eq(servicesTable.providerId, ps.service)];
      if (apiProviderConfigId) conds.push(eq(servicesTable.apiProviderConfigId, apiProviderConfigId));
      const [existing] = await db.select().from(servicesTable).where(and(...conds)).limit(1);
      if (existing) { await db.update(servicesTable).set({ name: ps.name, category: ps.category, min: parseInt(ps.min), max: parseInt(ps.max), basePricePerK: base, finalPricePerK: final, updatedAt: new Date() }).where(eq(servicesTable.id, existing.id)); updated++; }
      else { await db.insert(servicesTable).values({ providerId: ps.service, apiProviderConfigId: apiProviderConfigId || null, name: ps.name, category: ps.category, min: parseInt(ps.min), max: parseInt(ps.max), basePricePerK: base, markupPercent: 0, finalPricePerK: final, refill: ps.refill, cancel: ps.cancel, type: ps.type }); created++; }
    }
    return res.json({ success: true, created, updated });
  } catch (err) { console.error(err); return res.status(500).json({ error: "Internal server error" }); }
});

export default router;
