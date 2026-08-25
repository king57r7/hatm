import { Router } from "express";
import { db, servicesTable, siteSettingsTable } from "../db.js";
import { eq, and, or, ilike, inArray, sql } from "drizzle-orm";
import { getSession } from "../lib/session.js";
import { fetchProviderServices, ProviderRequestError } from "../lib/provider.js";

const router = Router();
const activeSyncs = new Map<string, Promise<SyncResult>>();
const SYNC_CHUNK_SIZE = 200;

type SyncResult = {
  created: number;
  updated: number;
  received: number;
  skipped: number;
  durationMs: number;
};

type ProviderService = {
  providerId: number;
  name: string;
  category: string;
  min: number;
  max: number;
  basePricePerK: number;
  refill: boolean;
  cancel: boolean;
  type: string | null;
  imageUrl: string | null;
};

function getSettingsMap(settings: Array<{ key: string; value: string }>) {
  return Object.fromEntries(settings.map(setting => [setting.key, setting.value]));
}

function validNumber(value: unknown, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function safeRemoteUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function trimText(value: unknown, fallback = "", max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : fallback;
}

function normalizeProviderServices(rawServices: any[]): ProviderService[] {
  const uniqueServices = new Map<number, ProviderService>();

  for (const raw of rawServices) {
    const providerId = Math.trunc(validNumber(raw?.service, NaN));
    const basePricePerK = validNumber(raw?.rate, NaN);
    const min = Math.max(0, Math.trunc(validNumber(raw?.min, NaN)));
    const max = Math.max(min, Math.trunc(validNumber(raw?.max, NaN)));
    const name = trimText(raw?.name);
    const category = trimText(raw?.category, "Other", 250);

    if (!Number.isInteger(providerId) || providerId <= 0 || !Number.isFinite(basePricePerK) || basePricePerK < 0 || !Number.isFinite(min) || !Number.isFinite(max) || !name) continue;

    uniqueServices.set(providerId, {
      providerId,
      name,
      category,
      min,
      max,
      basePricePerK,
      refill: raw?.refill === true || raw?.refill === "true" || raw?.refill === 1 || raw?.refill === "1",
      cancel: raw?.cancel === true || raw?.cancel === "true" || raw?.cancel === 1 || raw?.cancel === "1",
      type: trimText(raw?.type, "", 100) || null,
      imageUrl: safeRemoteUrl(raw?.imageUrl ?? raw?.image_url ?? raw?.image ?? raw?.picture ?? raw?.thumbnail),
    });
  }

  return [...uniqueServices.values()];
}

async function syncProviderCatalog(apiProviderConfigId: string): Promise<SyncResult> {
  const startedAt = Date.now();
  const [providerServices, settings] = await Promise.all([
    fetchProviderServices(apiProviderConfigId),
    db.select().from(siteSettingsTable),
  ]);
  const normalizedServices = normalizeProviderServices(providerServices);
  if (!normalizedServices.length) throw new ProviderRequestError("لم يرسل المزود أي خدمة قابلة للاستيراد.");

  const settingsMap = getSettingsMap(settings);
  const defaultMarkup = Math.min(10_000, Math.max(-100, validNumber(settingsMap.global_markup, 0)));
  const existing = await db.select({ providerId: servicesTable.providerId }).from(servicesTable).where(eq(servicesTable.apiProviderConfigId, apiProviderConfigId));
  const existingProviderIds = new Set(existing.map(service => service.providerId));
  const now = new Date();

  for (let cursor = 0; cursor < normalizedServices.length; cursor += SYNC_CHUNK_SIZE) {
    const chunk = normalizedServices.slice(cursor, cursor + SYNC_CHUNK_SIZE);
    await db.insert(servicesTable).values(chunk.map(service => ({
      providerId: service.providerId,
      apiProviderConfigId,
      name: service.name,
      category: service.category,
      imageUrl: service.imageUrl,
      min: service.min,
      max: service.max,
      basePricePerK: service.basePricePerK,
      markupPercent: defaultMarkup,
      finalPricePerK: service.basePricePerK * (1 + defaultMarkup / 100),
      refill: service.refill,
      cancel: service.cancel,
      type: service.type,
      syncedAt: now,
      updatedAt: now,
    }))).onConflictDoUpdate({
      target: [servicesTable.apiProviderConfigId, servicesTable.providerId],
      set: {
        name: sql`excluded.name`,
        category: sql`excluded.category`,
        imageUrl: sql`excluded.image_url`,
        min: sql`excluded.min`,
        max: sql`excluded.max`,
        basePricePerK: sql`excluded.base_price_per_k`,
        finalPricePerK: sql`excluded.base_price_per_k * (1 + ${servicesTable.markupPercent} / 100)`,
        refill: sql`excluded.refill`,
        cancel: sql`excluded.cancel`,
        type: sql`excluded.type`,
        syncedAt: now,
        updatedAt: now,
      },
    });
  }

  const created = normalizedServices.filter(service => !existingProviderIds.has(service.providerId)).length;
  return {
    created,
    updated: normalizedServices.length - created,
    received: providerServices.length,
    skipped: providerServices.length - normalizedServices.length,
    durationMs: Date.now() - startedAt,
  };
}

router.get("/api/services", async (req, res) => {
  try {
    const session = await getSession(req, res);
    if (!session.userId) return res.status(401).json({ error: "Unauthorized" });
    const adminView = req.query.admin === "true" && session.role === "ADMIN";
    const settingsRaw = await db.select().from(siteSettingsTable);
    const multiplier = Math.max(0, validNumber(getSettingsMap(settingsRaw).price_multiplier, 1));
    const conditions: any[] = [];

    if (!adminView) {
      conditions.push(eq(servicesTable.isActive, true));
      conditions.push(eq(servicesTable.isHidden, false));
    }
    if (typeof req.query.category === "string" && req.query.category) conditions.push(eq(servicesTable.category, req.query.category));
    if (adminView && typeof req.query.provider === "string" && req.query.provider) conditions.push(eq(servicesTable.apiProviderConfigId, req.query.provider));
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

    const [services, allCategories] = await Promise.all([
      conditions.length ? db.select().from(servicesTable).where(and(...conditions)) : db.select().from(servicesTable),
      db.select({ category: servicesTable.category }).from(servicesTable),
    ]);
    const categories = [...new Set(allCategories.map(service => service.category))].sort();
    return res.json({
      services: services.map(service => ({ ...service, displayPricePerK: service.finalPricePerK * multiplier })),
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
      const percentage = validNumber(markupPercent, NaN);
      if (!Number.isFinite(percentage) || percentage < -100 || percentage > 10000) return res.status(400).json({ error: "Enter a valid markup percentage" });
      const selected = await db.select({ id: servicesTable.id, basePricePerK: servicesTable.basePricePerK }).from(servicesTable).where(inArray(servicesTable.id, uniqueIds));
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
    if (body.nameAr !== undefined) updates.nameAr = trimText(body.nameAr, "", 500) || null;
    if (body.categoryAr !== undefined) updates.categoryAr = trimText(body.categoryAr, "", 250) || null;
    if (body.description !== undefined) updates.description = trimText(body.description, "", 2000) || null;
    if (body.descriptionAr !== undefined) updates.descriptionAr = trimText(body.descriptionAr, "", 2000) || null;
    if (body.imageUrl !== undefined) updates.imageUrl = safeRemoteUrl(body.imageUrl);
    if (body.isActive !== undefined) updates.isActive = Boolean(body.isActive);
    if (body.isHidden !== undefined) updates.isHidden = Boolean(body.isHidden);
    if (body.name !== undefined) updates.name = trimText(body.name, service.name, 500);
    if (body.markupPercent !== undefined) {
      const markupPercent = validNumber(body.markupPercent, NaN);
      if (!Number.isFinite(markupPercent) || markupPercent < -100 || markupPercent > 10000) return res.status(400).json({ error: "Enter a valid markup percentage" });
      updates.markupPercent = markupPercent;
      updates.finalPricePerK = service.basePricePerK * (1 + markupPercent / 100);
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
    const providerServiceId = Math.trunc(validNumber(req.body.providerServiceId, NaN));
    const apiProviderConfigId = typeof req.body.apiProviderConfigId === "string" ? req.body.apiProviderConfigId : "";
    if (!Number.isInteger(providerServiceId) || !apiProviderConfigId) return res.status(400).json({ error: "providerServiceId and apiProviderConfigId are required" });
    const [service] = await db.select().from(servicesTable).where(and(eq(servicesTable.providerId, providerServiceId), eq(servicesTable.apiProviderConfigId, apiProviderConfigId))).limit(1);
    if (!service) return res.status(404).json({ error: "الخدمة غير متاحة محلياً. يرجى مزامنة المزود أولاً." });
    return res.json({ service, success: true, action: "existing" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/api/services/sync", async (req, res) => {
  try {
    const session = await getSession(req, res);
    if (!session.userId || session.role !== "ADMIN") return res.status(401).json({ error: "Unauthorized" });
    const apiProviderConfigId = typeof req.body.apiProviderConfigId === "string" ? req.body.apiProviderConfigId.trim() : "";
    if (!apiProviderConfigId) return res.status(400).json({ error: "يجب اختيار مزود صالح للمزامنة." });
    if (activeSyncs.has(apiProviderConfigId)) return res.status(409).json({ error: "توجد مزامنة قيد التنفيذ لهذا المزود. انتظر اكتمالها ثم أعد المحاولة." });

    const task = syncProviderCatalog(apiProviderConfigId);
    activeSyncs.set(apiProviderConfigId, task);
    try {
      const result = await task;
      return res.json({ success: true, ...result });
    } finally {
      activeSyncs.delete(apiProviderConfigId);
    }
  } catch (err) {
    console.error(err);
    if (err instanceof ProviderRequestError) return res.status(err.statusCode).json({ error: err.message });
    return res.status(500).json({ error: "تعذرت مزامنة الخدمات. حاول مرة أخرى لاحقاً." });
  }
});

export default router;
