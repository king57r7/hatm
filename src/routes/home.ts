import { Router } from "express";
import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import { bannersTable, db, servicesTable, siteSettingsTable } from "../db.js";
import { getSession } from "../lib/session.js";

const router = Router();
const MAX_FEATURED_SERVICES = 12;
const MAX_BANNERS = 30;

async function requireAdmin(req: any, res: any) {
  const session = await getSession(req, res);
  if (!session.userId || session.role !== "ADMIN") {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return session;
}

function textValue(value: unknown, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function nullableText(value: unknown, max = 500) {
  const normalized = textValue(value, max);
  return normalized || null;
}

function safeUrl(value: unknown, allowInternal = false) {
  if (typeof value !== "string" || !value.trim()) return null;
  const normalized = value.trim();
  if (allowInternal && normalized.startsWith("/") && !normalized.startsWith("//")) return normalized;
  try {
    const url = new URL(normalized);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function safeColor(value: unknown) {
  const normalized = textValue(value, 9);
  return /^#[0-9a-fA-F]{6}$/.test(normalized) ? normalized : "#64748b";
}

function safeOrder(value: unknown, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, Math.min(999, Math.trunc(numeric))) : fallback;
}

async function getMultiplier() {
  const settings = await db.select().from(siteSettingsTable);
  const multiplier = Number(Object.fromEntries(settings.map(setting => [setting.key, setting.value])).price_multiplier || "1");
  return Number.isFinite(multiplier) && multiplier >= 0 ? multiplier : 1;
}

router.get("/api/home-content", async (_req, res) => {
  try {
    const [banners, featuredServices, multiplier] = await Promise.all([
      db.select().from(bannersTable).where(eq(bannersTable.isActive, true)).orderBy(asc(bannersTable.displayOrder), desc(bannersTable.updatedAt)),
      db.select().from(servicesTable).where(and(eq(servicesTable.isFeatured, true), eq(servicesTable.isActive, true), eq(servicesTable.isHidden, false))).orderBy(asc(servicesTable.featuredOrder), desc(servicesTable.updatedAt)).limit(MAX_FEATURED_SERVICES),
      getMultiplier(),
    ]);
    return res.json({
      banners,
      featuredServices: featuredServices.map(service => ({ ...service, displayPricePerK: service.finalPricePerK * multiplier })),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Unable to load home content" });
  }
});

router.get("/api/admin/home-content", async (req, res) => {
  try {
    if (!await requireAdmin(req, res)) return;
    const [banners, featuredServices] = await Promise.all([
      db.select().from(bannersTable).orderBy(asc(bannersTable.displayOrder), desc(bannersTable.updatedAt)),
      db.select().from(servicesTable).where(eq(servicesTable.isFeatured, true)).orderBy(asc(servicesTable.featuredOrder), desc(servicesTable.updatedAt)),
    ]);
    return res.json({ banners, featuredServices, maxFeaturedServices: MAX_FEATURED_SERVICES });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Unable to load home manager" });
  }
});

router.get("/api/admin/home-services", async (req, res) => {
  try {
    if (!await requireAdmin(req, res)) return;
    const search = typeof req.query.search === "string" ? req.query.search.trim().slice(0, 100) : "";
    const conditions = [eq(servicesTable.isActive, true), eq(servicesTable.isHidden, false)];
    if (search) conditions.push(or(
      ilike(servicesTable.name, `%${search}%`),
      ilike(servicesTable.nameAr, `%${search}%`),
      ilike(servicesTable.category, `%${search}%`),
    ) as any);
    const services = await db.select({
      id: servicesTable.id,
      providerId: servicesTable.providerId,
      name: servicesTable.name,
      nameAr: servicesTable.nameAr,
      category: servicesTable.category,
      imageUrl: servicesTable.imageUrl,
      isFeatured: servicesTable.isFeatured,
    }).from(servicesTable).where(and(...conditions)).orderBy(asc(servicesTable.category), asc(servicesTable.name)).limit(80);
    return res.json({ services });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Unable to load services" });
  }
});

router.post("/api/admin/banners", async (req, res) => {
  try {
    if (!await requireAdmin(req, res)) return;
    const title = textValue(req.body.title);
    if (!title) return res.status(400).json({ error: "عنوان البنر مطلوب." });
    const [count] = await db.select({ total: sql<number>`count(*)` }).from(bannersTable);
    if (Number(count?.total || 0) >= MAX_BANNERS) return res.status(400).json({ error: `الحد الأقصى للبنرات هو ${MAX_BANNERS}.` });
    const [banner] = await db.insert(bannersTable).values({
      title,
      titleAr: nullableText(req.body.titleAr),
      subtitle: nullableText(req.body.subtitle, 1000),
      subtitleAr: nullableText(req.body.subtitleAr, 1000),
      imageUrl: safeUrl(req.body.imageUrl),
      actionUrl: safeUrl(req.body.actionUrl, true),
      actionLabel: nullableText(req.body.actionLabel, 100),
      actionLabelAr: nullableText(req.body.actionLabelAr, 100),
      accentColor: safeColor(req.body.accentColor),
      isActive: req.body.isActive !== false,
      displayOrder: safeOrder(req.body.displayOrder),
    }).returning();
    return res.status(201).json({ success: true, banner });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Unable to create banner" });
  }
});

router.patch("/api/admin/banners/:id", async (req, res) => {
  try {
    if (!await requireAdmin(req, res)) return;
    const updates: any = { updatedAt: new Date() };
    if (req.body.title !== undefined) {
      const title = textValue(req.body.title);
      if (!title) return res.status(400).json({ error: "عنوان البنر مطلوب." });
      updates.title = title;
    }
    if (req.body.titleAr !== undefined) updates.titleAr = nullableText(req.body.titleAr);
    if (req.body.subtitle !== undefined) updates.subtitle = nullableText(req.body.subtitle, 1000);
    if (req.body.subtitleAr !== undefined) updates.subtitleAr = nullableText(req.body.subtitleAr, 1000);
    if (req.body.imageUrl !== undefined) updates.imageUrl = safeUrl(req.body.imageUrl);
    if (req.body.actionUrl !== undefined) updates.actionUrl = safeUrl(req.body.actionUrl, true);
    if (req.body.actionLabel !== undefined) updates.actionLabel = nullableText(req.body.actionLabel, 100);
    if (req.body.actionLabelAr !== undefined) updates.actionLabelAr = nullableText(req.body.actionLabelAr, 100);
    if (req.body.accentColor !== undefined) updates.accentColor = safeColor(req.body.accentColor);
    if (req.body.isActive !== undefined) updates.isActive = Boolean(req.body.isActive);
    if (req.body.displayOrder !== undefined) updates.displayOrder = safeOrder(req.body.displayOrder);
    const [banner] = await db.update(bannersTable).set(updates).where(eq(bannersTable.id, req.params.id)).returning();
    if (!banner) return res.status(404).json({ error: "Banner not found" });
    return res.json({ success: true, banner });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Unable to update banner" });
  }
});

router.delete("/api/admin/banners/:id", async (req, res) => {
  try {
    if (!await requireAdmin(req, res)) return;
    await db.delete(bannersTable).where(eq(bannersTable.id, req.params.id));
    return res.json({ success: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Unable to delete banner" });
  }
});

router.patch("/api/admin/services/:id/featured", async (req, res) => {
  try {
    if (!await requireAdmin(req, res)) return;
    const isFeatured = Boolean(req.body.isFeatured);
    const [service] = await db.select().from(servicesTable).where(eq(servicesTable.id, req.params.id)).limit(1);
    if (!service) return res.status(404).json({ error: "Service not found" });

    if (isFeatured && !service.isFeatured) {
      const [count] = await db.select({ total: sql<number>`count(*)` }).from(servicesTable).where(eq(servicesTable.isFeatured, true));
      if (Number(count?.total || 0) >= MAX_FEATURED_SERVICES) return res.status(400).json({ error: `يمكن اختيار ${MAX_FEATURED_SERVICES} خدمة مميزة كحد أقصى.` });
    }

    const featuredOrder = isFeatured ? safeOrder(req.body.featuredOrder, service.featuredOrder || 0) : 0;
    const [updated] = await db.update(servicesTable).set({ isFeatured, featuredOrder, updatedAt: new Date() }).where(eq(servicesTable.id, req.params.id)).returning();
    return res.json({ success: true, service: updated });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Unable to update featured service" });
  }
});

export default router;
