import { Router } from "express";
import { db, sectionsTable, servicesTable, siteSettingsTable } from "../db.js";
import { eq, asc, and, inArray } from "drizzle-orm";
import { getSession } from "../lib/session.js";

const router = Router();

const MAX_SECTION_IMAGE_BYTES = 2 * 1024 * 1024; // 2MB decoded

function parseServiceIds(value: string) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed.map(Number).filter(Number.isInteger) : [];
  } catch {
    return [];
  }
}

// Accepts either a normal http(s) image URL, or a base64 data: URL uploaded
// directly from the admin panel (same pattern used for the site logo).
function safeImageValue(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const normalized = value.trim();
  if (normalized.startsWith("data:image/")) {
    const base64Part = normalized.split(",")[1] || "";
    const approxBytes = Math.floor((base64Part.length * 3) / 4);
    if (approxBytes > MAX_SECTION_IMAGE_BYTES) return null;
    return normalized;
  }
  try {
    const url = new URL(normalized);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

router.get("/api/sections", async (req, res) => {
  try {
    const session = await getSession(req, res);
    if (!session.userId) return res.status(401).json({ error: "Unauthorized" });
    const adminMode = req.query.admin === "true" && session.role === "ADMIN";
    const sections = adminMode
      ? await db.select().from(sectionsTable).orderBy(asc(sectionsTable.displayOrder))
      : await db.select().from(sectionsTable).where(eq(sectionsTable.isVisible, true)).orderBy(asc(sectionsTable.displayOrder));
    return res.json({ sections });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/api/sections", async (req, res) => {
  try {
    const session = await getSession(req, res);
    if (!session.userId || session.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    const { name, nameAr, icon, color, imageUrl, description, descriptionAr, apiProviderConfigId, serviceMode, serviceIds, displayOrder } = req.body;
    if (!name || !nameAr) return res.status(400).json({ error: "Name required in both languages" });
    const [section] = await db.insert(sectionsTable).values({
      name,
      nameAr,
      icon: icon || "🌐",
      color: color || "#f59e0b",
      imageUrl: safeImageValue(imageUrl),
      description,
      descriptionAr,
      apiProviderConfigId: apiProviderConfigId || null,
      serviceMode: serviceMode || "selected",
      serviceIds: JSON.stringify(Array.isArray(serviceIds) ? serviceIds.map(Number).filter(Number.isInteger) : []),
      displayOrder: Number.isFinite(Number(displayOrder)) ? Number(displayOrder) : 0,
    }).returning();
    return res.json({ section, success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/api/sections/:id", async (req, res) => {
  try {
    const session = await getSession(req, res);
    if (!session.userId || session.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    const body = req.body;
    const updates: any = { updatedAt: new Date() };
    if (body.name !== undefined) updates.name = body.name;
    if (body.nameAr !== undefined) updates.nameAr = body.nameAr;
    if (body.icon !== undefined) updates.icon = body.icon;
    if (body.color !== undefined) updates.color = body.color;
    if (body.imageUrl !== undefined) updates.imageUrl = safeImageValue(body.imageUrl);
    if (body.description !== undefined) updates.description = body.description;
    if (body.descriptionAr !== undefined) updates.descriptionAr = body.descriptionAr;
    if (body.apiProviderConfigId !== undefined) updates.apiProviderConfigId = body.apiProviderConfigId || null;
    if (body.serviceMode !== undefined) updates.serviceMode = body.serviceMode;
    if (body.serviceIds !== undefined) updates.serviceIds = JSON.stringify(Array.isArray(body.serviceIds) ? body.serviceIds.map(Number).filter(Number.isInteger) : []);
    if (body.displayOrder !== undefined && Number.isFinite(Number(body.displayOrder))) updates.displayOrder = Number(body.displayOrder);
    if (body.isVisible !== undefined) updates.isVisible = Boolean(body.isVisible);
    const [section] = await db.update(sectionsTable).set(updates).where(eq(sectionsTable.id, req.params.id)).returning();
    return res.json({ section, success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/api/sections/:id", async (req, res) => {
  try {
    const session = await getSession(req, res);
    if (!session.userId || session.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    await db.delete(sectionsTable).where(eq(sectionsTable.id, req.params.id));
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/api/sections/:id/services", async (req, res) => {
  try {
    const session = await getSession(req, res);
    if (!session.userId) return res.status(401).json({ error: "Unauthorized" });
    const [section] = await db.select().from(sectionsTable).where(eq(sectionsTable.id, req.params.id)).limit(1);
    if (!section) return res.status(404).json({ error: "Not found" });
    if (!section.isVisible && session.role !== "ADMIN") return res.status(403).json({ error: "Forbidden" });

    const settingsRaw = await db.select().from(siteSettingsTable);
    const multiplier = Math.max(0, Number(Object.fromEntries(settingsRaw.map(setting => [setting.key, setting.value])).price_multiplier || "1"));
    const selectedProviderIds = parseServiceIds(section.serviceIds);
    const conditions: any[] = [eq(servicesTable.isActive, true), eq(servicesTable.isHidden, false)];
    
    // If section has an apiProviderConfigId, always filter by it
    if (section.apiProviderConfigId) {
      conditions.push(eq(servicesTable.apiProviderConfigId, section.apiProviderConfigId));
    }
    
    // If serviceMode is "selected", only include the explicitly selected services
    if (section.serviceMode === "selected") {
      if (!selectedProviderIds.length) return res.json({ services: [], section, catalogSynced: true });
      conditions.push(inArray(servicesTable.providerId, selectedProviderIds));
    }
    // If serviceMode is "all", return all services from the apiProviderConfigId or all active services

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const services = whereClause 
      ? await db.select().from(servicesTable).where(whereClause)
      : await db.select().from(servicesTable);
    
    return res.json({
      services: services.map(service => ({ ...service, finalPricePerK: service.finalPricePerK * multiplier })),
      section,
      catalogSynced: true,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
