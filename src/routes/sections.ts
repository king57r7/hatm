import { Router } from "express";
import { db, sectionsTable, servicesTable, siteSettingsTable } from "../db.js";
import { eq, asc, and, inArray } from "drizzle-orm";
import { getSession } from "../lib/session.js";
import { fetchProviderServices, fetchProviderServicesByIds } from "../lib/provider.js";

const router = Router();

router.get("/api/sections", async (req, res) => {
  try {
    const session = await getSession(req, res);
    if (!session.userId) return res.status(401).json({ error: "Unauthorized" });
    const adminMode = req.query.admin === "true" && session.role === "ADMIN";
    const sections = adminMode
      ? await db.select().from(sectionsTable).orderBy(asc(sectionsTable.displayOrder))
      : await db.select().from(sectionsTable).where(eq(sectionsTable.isVisible, true)).orderBy(asc(sectionsTable.displayOrder));
    return res.json({ sections });
  } catch { return res.status(500).json({ error: "Internal server error" }); }
});

router.post("/api/sections", async (req, res) => {
  try {
    const session = await getSession(req, res);
    if (!session.userId || session.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    const { name, nameAr, icon, color, description, descriptionAr, apiProviderConfigId, serviceMode, serviceIds, displayOrder } = req.body;
    if (!name || !nameAr) return res.status(400).json({ error: "Name required in both languages" });
    const [section] = await db.insert(sectionsTable).values({ name, nameAr, icon: icon || "🌐", color: color || "#f59e0b", description, descriptionAr, apiProviderConfigId: apiProviderConfigId || null, serviceMode: serviceMode || "selected", serviceIds: JSON.stringify(Array.isArray(serviceIds) ? serviceIds : []), displayOrder: displayOrder || 0 }).returning();
    return res.json({ section, success: true });
  } catch { return res.status(500).json({ error: "Internal server error" }); }
});

router.patch("/api/sections/:id", async (req, res) => {
  try {
    const session = await getSession(req, res);
    if (!session.userId || session.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    const b = req.body; const u: any = { updatedAt: new Date() };
    if (b.name !== undefined) u.name = b.name;
    if (b.nameAr !== undefined) u.nameAr = b.nameAr;
    if (b.icon !== undefined) u.icon = b.icon;
    if (b.color !== undefined) u.color = b.color;
    if (b.description !== undefined) u.description = b.description;
    if (b.descriptionAr !== undefined) u.descriptionAr = b.descriptionAr;
    if (b.apiProviderConfigId !== undefined) u.apiProviderConfigId = b.apiProviderConfigId || null;
    if (b.serviceMode !== undefined) u.serviceMode = b.serviceMode;
    if (b.serviceIds !== undefined) u.serviceIds = JSON.stringify(Array.isArray(b.serviceIds) ? b.serviceIds : []);
    if (b.displayOrder !== undefined) u.displayOrder = b.displayOrder;
    if (b.isVisible !== undefined) u.isVisible = b.isVisible;
    const [section] = await db.update(sectionsTable).set(u).where(eq(sectionsTable.id, req.params.id)).returning();
    return res.json({ section, success: true });
  } catch { return res.status(500).json({ error: "Internal server error" }); }
});

router.delete("/api/sections/:id", async (req, res) => {
  try {
    const session = await getSession(req, res);
    if (!session.userId || session.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    await db.delete(sectionsTable).where(eq(sectionsTable.id, req.params.id));
    return res.json({ success: true });
  } catch { return res.status(500).json({ error: "Internal server error" }); }
});

router.get("/api/sections/:id/services", async (req, res) => {
  try {
    const session = await getSession(req, res);
    if (!session.userId) return res.status(401).json({ error: "Unauthorized" });
    const [section] = await db.select().from(sectionsTable).where(eq(sectionsTable.id, req.params.id)).limit(1);
    if (!section) return res.status(404).json({ error: "Not found" });
    if (!section.isVisible && session.role !== "ADMIN") return res.status(403).json({ error: "Forbidden" });

    const settingsRaw = await db.select().from(siteSettingsTable);
    const settingsMap = Object.fromEntries(settingsRaw.map((s: any) => [s.key, s.value]));
    const multiplier = parseFloat(settingsMap.price_multiplier || "1");
    let services: any[] = [];

    if (section.apiProviderConfigId) {
      const raw = section.serviceMode === "all"
        ? await fetchProviderServices(section.apiProviderConfigId)
        : await fetchProviderServicesByIds(JSON.parse(section.serviceIds || "[]"), section.apiProviderConfigId);
      services = raw.map((s: any) => ({ id: `provider-${s.service}`, providerId: s.service, name: s.name, category: s.category, min: parseInt(s.min), max: parseInt(s.max), finalPricePerK: parseFloat(s.rate) * multiplier, basePricePerK: parseFloat(s.rate), refill: s.refill, cancel: s.cancel, type: s.type, isActive: true, fromProvider: true, apiProviderConfigId: section.apiProviderConfigId }));
    } else {
      const ids: number[] = JSON.parse(section.serviceIds || "[]");
      if (ids.length > 0) {
        const dbSvcs = await db.select().from(servicesTable).where(and(inArray(servicesTable.providerId, ids), eq(servicesTable.isActive, true)));
        services = dbSvcs.map((s: any) => ({ ...s, finalPricePerK: s.basePricePerK * multiplier }));
      }
    }
    return res.json({ services, section });
  } catch { return res.status(500).json({ error: "Internal server error" }); }
});

export default router;
