import { Router } from "express";
import { db, ordersTable, servicesTable, usersTable, siteSettingsTable } from "../db.js";
import { eq, desc, and } from "drizzle-orm";
import { getSession } from "../lib/session.js";
import { placeProviderOrder, getProviderOrderStatus, refillProviderOrder, mapProviderStatus } from "../lib/provider.js";

const router = Router();

router.get("/api/orders", async (req, res) => {
  try {
    const session = await getSession(req, res);
    if (!session.userId) return res.status(401).json({ error: "Unauthorized" });
    const isAdmin = session.role === "ADMIN" && req.query.admin === "true";
    const orders = isAdmin
      ? await db.select({ id: ordersTable.id, link: ordersTable.link, quantity: ordersTable.quantity, pricePaid: ordersTable.pricePaid, status: ordersTable.status, createdAt: ordersTable.createdAt, service: { name: servicesTable.name }, user: { username: usersTable.username } }).from(ordersTable).leftJoin(servicesTable, eq(ordersTable.serviceId, servicesTable.id)).leftJoin(usersTable, eq(ordersTable.userId, usersTable.id)).orderBy(desc(ordersTable.createdAt)).limit(100)
      : await db.select({ id: ordersTable.id, link: ordersTable.link, quantity: ordersTable.quantity, pricePaid: ordersTable.pricePaid, status: ordersTable.status, createdAt: ordersTable.createdAt, startCount: ordersTable.startCount, remains: ordersTable.remains, service: { name: servicesTable.name, nameAr: servicesTable.nameAr } }).from(ordersTable).leftJoin(servicesTable, eq(ordersTable.serviceId, servicesTable.id)).where(eq(ordersTable.userId, session.userId)).orderBy(desc(ordersTable.createdAt));
    return res.json({ orders });
  } catch { return res.status(500).json({ error: "Internal server error" }); }
});

router.post("/api/orders", async (req, res) => {
  try {
    const session = await getSession(req, res);
    if (!session.userId) return res.status(401).json({ error: "Unauthorized" });
    const { serviceId, link, quantity } = req.body;
    if (!serviceId || !link || !quantity) return res.status(400).json({ error: "serviceId, link, quantity required" });
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId)).limit(1);
    const [service] = await db.select().from(servicesTable).where(eq(servicesTable.id, serviceId)).limit(1);
    if (!service || !service.isActive) return res.status(404).json({ error: "Service not found" });
    if (quantity < service.min || quantity > service.max) return res.status(400).json({ error: `Quantity must be ${service.min}-${service.max}` });

    const settingsRaw = await db.select().from(siteSettingsTable);
    const multiplier = parseFloat(Object.fromEntries(settingsRaw.map((s: any) => [s.key, s.value])).price_multiplier || "1");
    const displayPrice = service.basePricePerK * multiplier;
    const cost = (displayPrice / 1000) * quantity;
    const purchaseCost = (service.basePricePerK / 1000) * quantity;

    if (user.walletBalance < cost) return res.status(400).json({ error: "Insufficient balance" });

    await db.update(usersTable).set({ walletBalance: user.walletBalance - cost, totalSpent: user.totalSpent + cost, updatedAt: new Date() }).where(eq(usersTable.id, session.userId));

    let providerOrderId: number | undefined;
    const result = await placeProviderOrder(service.providerId, link, quantity, service.apiProviderConfigId || undefined);
    if ("order" in result) providerOrderId = result.order;

    const [order] = await db.insert(ordersTable).values({ userId: session.userId, serviceId, link, quantity, pricePaid: cost, purchaseCost, profit: cost - purchaseCost, providerOrderId, status: "PENDING" }).returning();
    return res.json({ order });
  } catch { return res.status(500).json({ error: "Internal server error" }); }
});

router.get("/api/orders/:id", async (req, res) => {
  try {
    const session = await getSession(req, res);
    if (!session.userId) return res.status(401).json({ error: "Unauthorized" });
    const [order] = await db.select().from(ordersTable).where(and(eq(ordersTable.id, req.params.id), session.role !== "ADMIN" ? eq(ordersTable.userId, session.userId) : undefined as any)).limit(1);
    if (!order) return res.status(404).json({ error: "Not found" });
    if (order.providerOrderId) {
      const [svc] = await db.select().from(servicesTable).where(eq(servicesTable.id, order.serviceId)).limit(1);
      const status = await getProviderOrderStatus(order.providerOrderId, svc?.apiProviderConfigId || undefined);
      if (status?.status) {
        const mapped = mapProviderStatus(status.status) as any;
        await db.update(ordersTable).set({ status: mapped, startCount: status.start_count ? parseInt(status.start_count) : order.startCount, remains: status.remains ? parseInt(status.remains) : order.remains, updatedAt: new Date() }).where(eq(ordersTable.id, order.id));
        return res.json({ order: { ...order, status: mapped, startCount: status.start_count, remains: status.remains } });
      }
    }
    return res.json({ order });
  } catch { return res.status(500).json({ error: "Internal server error" }); }
});

router.post("/api/orders/:id/refill", async (req, res) => {
  try {
    const session = await getSession(req, res);
    if (!session.userId) return res.status(401).json({ error: "Unauthorized" });
    const [order] = await db.select().from(ordersTable).where(and(eq(ordersTable.id, req.params.id), eq(ordersTable.userId, session.userId))).limit(1);
    if (!order || !order.providerOrderId) return res.status(404).json({ error: "Not found" });
    const [svc] = await db.select().from(servicesTable).where(eq(servicesTable.id, order.serviceId)).limit(1);
    const result = await refillProviderOrder(order.providerOrderId, svc?.apiProviderConfigId || undefined);
    if ("error" in result) return res.status(400).json({ error: result.error });
    return res.json({ success: true });
  } catch { return res.status(500).json({ error: "Internal server error" }); }
});

export default router;
