import { Router } from "express";
import { db, servicesTable, siteSettingsTable } from "../db.js";
import { eq, and, or, ilike, inArray } from "drizzle-orm";
import { getSession } from "../lib/session.js";
import { fetchProviderServices } from "../lib/provider.js";

const router = Router();

router.get("/api/services", async (req, res) => {
  try {
    const session = await getSession(req, res);
    if (!session.userId) return res.status(401).json({ error: "Unauthorized" });
    const adminView = req.query.admin === "true" && session.role === "ADMIN";
    const settingsRaw = await db.select().from(siteSettingsTable);
    const multiplier = parseFloat(Object.fromEntries(settingsRaw.map((setting: any) => [setting.key, setting.value])).price_multiplier || "1");
    const conditions: any[] = [];

    if (!adminView) {
      conditions.push(eq(servicesTable.isActive, true));
      conditions.push(eq(servicesTable.isHidden, false));
    }
    if (req.query.category) conditions.push(eq(servicesTable.category, req.query.category as string));
    if (adminView && req.query.provider) conditions.push(eq(servicesTable.apiProviderConfigId, req.query.provider as string));
    if (adminView && req.query.status === "active") conditions.push(eq(servicesTable.isActive, true));
    if (adminView && req.query.status === "inactive") conditions.push(eq(servicesTable.isActive, false));
    if (adminView && req.query.status === "hidden") conditions.push(eq(servicesTable.isHidden, true));

    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    if (search) {
      conditions.push(or(
        ilike(servicesTable.name, `%${search}%`),
        ilike(servicesTable.nameAr, `%${search}%`),
        ilike(servicesTable.category, `%${search}%`),
        ilike(servicesTable.categoryAr, `%${search}%`),
      ));
    }

    const services = conditions.length ? await db.select().from(servicesTable).where(and(...conditions)) : await db.select().from(servicesTable);
    const allCategories = await db.select({ category: servicesTable.category }).from(servicesTable);
    const categories = [...new Set(allCategories.map((service: any) => service.category))].sort();
    return res.json({
      services: services.map((service: any) => ({ ...service, displayPricePerK: service.basePricePerK * multiplier })),
      categories,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/api/services/bulk", async (req, res) => {
  try {
    const session = await getSession(req, res);
    if (!session.userId || session.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });

    const { ids, action, markupPercent } = req.body as { ids?: unknown; action?: string; markupPercent?: unknown };
    if (!Array.isArray(ids) || ids.length === 0 || ids.some(id => typeof id !== "string")) return res.status(400).json({ error: "Select one or more services" });
    if (ids.length > 500) return res.status(400).json({ error: "A maximum of 500 services can be updated at once" });
    const uniqueIds = [...new Set(ids)];
    const now = new Date();

    if (action === "delete") {
      await db.delete(servicesTable).where(inArray(servicesTable.id, uniqueIds));
      return res.json({ success: true, affected: uniqueIds.length, action });
    }

    if (action === "activate" || action === "deactivate" || action === "hide" || action === "show") {
      const changes = action === "activate" ? { isActive: true, updatedAt: now }
        : action === "deactivate" ? { isActive: false, updatedAt: now }
        : action === "hide" ? { isHidden: true, updatedAt: now }
        : { isHidden: false, updatedAt: now };
      await db.update(servicesTable).set(changes).where(inArray(servicesTable.id, uniqueIds));
      return res.json({ success: true, affected: uniqueIds.length, action });
    }

    if (action === "markup") {
      const percentage = Number(markupPercent);
      if (!Number.isFinite(percentage) || percentage < -100 || percentage > 10000) return res.status(400).json({ error: "Enter a valid markup percentage" });
      const selected = await db.select().from(servicesTable).where(inArray(servicesTable.id, uniqueIds));
      await Promise.all(selected.map(service => db.update(servicesTable).set({
        markupPercent: percentage,
        finalPricePerK: service.basePricePerK * (1 + percentage / 100),
        updatedAt: now,
      }).where(eq(servicesTable.id, service.id))));
      return res.json({ success: true, affected: selected.length, action });
    }

    return res.status(400).json({ error: "Unsupported bulk action" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/api/services/:id", async (req, res) => {
  try {
    const session = await getSession(req, res);
    if (!session.userId || session.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    const [service] = await db.select().from(servicesTable).where(eq(servicesTable.id, req.params.id)).limit(1);
    if (!service) return res.status(404).json({ error: "Not found" });
    const body = req.body;
    const updates: any = { updatedAt: new Date() };
    if (body.nameAr !== undefined) updates.nameAr = body.nameAr;
    if (body.categoryAr !== undefined) updates.categoryAr = body.categoryAr;
    if (body.isActive !== undefined) updates.isActive = body.isActive;
    if (body.isHidden !== undefined) updates.isHidden = body.isHidden;
    if (body.name !== undefined) updates.name = body.name;
    if (body.markupPercent !== undefined) {
      updates.markupPercent = body.markupPercent;
      updates.finalPricePerK = service.basePricePerK * (1 + body.markupPercent / 100);
    }
    const [updated] = await db.update(servicesTable).set(updates).where(eq(servicesTable.id, req.params.id)).returning();
    return res.json({ service: updated });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/api/services/:id", async (req, res) => {
  try {
    const session = await getSession(req, res);
    if (!session.userId || session.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    await db.delete(servicesTable).where(eq(servicesTable.id, req.params.id));
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/api/services/add-by-id", async (req, res) => {
  try {
    const session = await getSession(req, res);
    if (!session.userId || session.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    const { providerServiceId, apiProviderConfigId } = req.body;
    if (!providerServiceId) return res.status(400).json({ error: "providerServiceId required" });
    const settingsRaw = await db.select().from(siteSettingsTable);
    const multiplier = parseFloat(Object.fromEntries(settingsRaw.map((setting: any) => [setting.key, setting.value])).price_multiplier || "1");
    const all = await fetchProviderServices(apiProviderConfigId);
    const providerService = all.find((service: any) => service.service === parseInt(providerServiceId));
    if (!providerService) return res.status(404).json({ error: "Service not found from provider" });
    const base = parseFloat(providerService.rate);
    const final = base * multiplier;
    const conditions: any[] = [eq(servicesTable.providerId, providerService.service)];
    if (apiProviderConfigId) conditions.push(eq(servicesTable.apiProviderConfigId, apiProviderConfigId));
    const [existing] = await db.select().from(servicesTable).where(and(...conditions)).limit(1);
    if (existing) {
      const [updated] = await db.update(servicesTable).set({ name: providerService.name, category: providerService.category, min: parseInt(providerService.min), max: parseInt(providerService.max), basePricePerK: base, finalPricePerK: final, refill: providerService.refill, cancel: providerService.cancel, type: providerService.type, isActive: true, updatedAt: new Date() }).where(eq(servicesTable.id, existing.id)).returning();
      return res.json({ service: updated, success: true, action: "updated" });
    }
    const [service] = await db.insert(servicesTable).values({ providerId: providerService.service, apiProviderConfigId: apiProviderConfigId || null, name: providerService.name, category: providerService.category, min: parseInt(providerService.min), max: parseInt(providerService.max), basePricePerK: base, markupPercent: 0, finalPricePerK: final, refill: providerService.refill, cancel: providerService.cancel, type: providerService.type }).returning();
    return res.json({ service, success: true, action: "created" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/api/services/sync", async (req, res) => {
  try {
    const session = await getSession(req, res);
    if (!session.userId || session.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    const { apiProviderConfigId } = req.body;
    const settingsRaw = await db.select().from(siteSettingsTable);
    const multiplier = parseFloat(Object.fromEntries(settingsRaw.map((setting: any) => [setting.key, setting.value])).price_multiplier || "1");
    const providerServices = await fetchProviderServices(apiProviderConfigId);
    if (!providerServices.length) return res.status(502).json({ error: "No services from provider" });
    let created = 0;
    let updated = 0;
    for (const providerService of providerServices as any[]) {
      const base = parseFloat(providerService.rate);
      const final = base * multiplier;
      const conditions: any[] = [eq(servicesTable.providerId, providerService.service)];
      if (apiProviderConfigId) conditions.push(eq(servicesTable.apiProviderConfigId, apiProviderConfigId));
      const [existing] = await db.select().from(servicesTable).where(and(...conditions)).limit(1);
      if (existing) {
        await db.update(servicesTable).set({ name: providerService.name, category: providerService.category, min: parseInt(providerService.min), max: parseInt(providerService.max), basePricePerK: base, finalPricePerK: final, updatedAt: new Date() }).where(eq(servicesTable.id, existing.id));
        updated++;
      } else {
        await db.insert(servicesTable).values({ providerId: providerService.service, apiProviderConfigId: apiProviderConfigId || null, name: providerService.name, category: providerService.category, min: parseInt(providerService.min), max: parseInt(providerService.max), basePricePerK: base, markupPercent: 0, finalPricePerK: final, refill: providerService.refill, cancel: providerService.cancel, type: providerService.type });
        created++;
      }
    }
    return res.json({ success: true, created, updated });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
