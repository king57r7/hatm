import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable, ordersTable, topUpRequestsTable, paymentMethodsTable, servicesTable, siteSettingsTable, apiProviderConfigsTable } from "../db.js";
import { eq, or, ilike, desc, sum, count } from "drizzle-orm";
import { getSession } from "../lib/session.js";

const router = Router();

async function requireAdmin(req: any, res: any) {
  const session = await getSession(req, res);
  if (!session.userId || session.role !== "ADMIN") { res.status(401).json({ error: "Unauthorized" }); return null; }
  return session;
}

router.get("/api/admin/stats", async (req, res) => {
  try {
    if (!await requireAdmin(req, res)) return;
    const [tu, wa, sa, to, co, fo, po, pa, pt] = await Promise.all([
      db.select({ count: count() }).from(usersTable).where(eq(usersTable.role, "USER")),
      db.select({ total: sum(usersTable.walletBalance) }).from(usersTable),
      db.select({ total: sum(usersTable.totalSpent) }).from(usersTable),
      db.select({ count: count() }).from(ordersTable),
      db.select({ count: count() }).from(ordersTable).where(eq(ordersTable.status, "COMPLETED")),
      db.select({ count: count() }).from(ordersTable).where(eq(ordersTable.status, "FAILED")),
      db.select({ count: count() }).from(ordersTable).where(eq(ordersTable.status, "PENDING")),
      db.select({ total: sum(ordersTable.profit) }).from(ordersTable),
      db.select({ count: count() }).from(topUpRequestsTable).where(eq(topUpRequestsTable.status, "PENDING")),
    ]);
    return res.json({ totalUsers: tu[0]?.count || 0, totalWalletBalance: parseFloat(wa[0]?.total || "0"), totalSpent: parseFloat(sa[0]?.total || "0"), totalOrders: to[0]?.count || 0, completedOrders: co[0]?.count || 0, failedOrders: fo[0]?.count || 0, pendingOrders: po[0]?.count || 0, totalProfit: parseFloat(pa[0]?.total || "0"), pendingTopUps: pt[0]?.count || 0 });
  } catch (err) { console.error(err); return res.status(500).json({ error: "Internal server error" }); }
});

router.get("/api/admin/users", async (req, res) => {
  try {
    if (!await requireAdmin(req, res)) return;
    const { search } = req.query;
    const where = search ? or(ilike(usersTable.username, `%${search}%`), ilike(usersTable.email, `%${search}%`)) : undefined;
    const users = await db.select({ id: usersTable.id, email: usersTable.email, username: usersTable.username, role: usersTable.role, isBlocked: usersTable.isBlocked, walletBalance: usersTable.walletBalance, totalSpent: usersTable.totalSpent, createdAt: usersTable.createdAt }).from(usersTable).where(where).orderBy(desc(usersTable.createdAt)).limit(50);
    return res.json({ users });
  } catch (err) { console.error(err); return res.status(500).json({ error: "Internal server error" }); }
});

router.patch("/api/admin/users/:id", async (req, res) => {
  try {
    if (!await requireAdmin(req, res)) return;
    const b = req.body; const u: any = { updatedAt: new Date() };
    if (b.isBlocked !== undefined) u.isBlocked = b.isBlocked;
    if (b.walletBalance !== undefined) u.walletBalance = parseFloat(b.walletBalance);
    if (b.role !== undefined) u.role = b.role;
    if (b.password) u.password = await bcrypt.hash(b.password, 12);
    const [user] = await db.update(usersTable).set(u).where(eq(usersTable.id, req.params.id)).returning();
    return res.json({ user, success: true });
  } catch (err) { console.error(err); return res.status(500).json({ error: "Internal server error" }); }
});

router.delete("/api/admin/users/:id", async (req, res) => {
  try {
    if (!await requireAdmin(req, res)) return;
    await db.delete(usersTable).where(eq(usersTable.id, req.params.id));
    return res.json({ success: true });
  } catch (err) { console.error(err); return res.status(500).json({ error: "Internal server error" }); }
});

router.post("/api/admin/create-admin", async (req, res) => {
  try {
    if (!await requireAdmin(req, res)) return;
    const { email, username, password } = req.body;
    if (!email || !username || !password) return res.status(400).json({ error: "All fields required" });
    const existing = await db.select().from(usersTable).where(or(eq(usersTable.email, email), eq(usersTable.username, username))).limit(1);
    if (existing.length > 0) return res.status(409).json({ error: "Email or username already taken" });
    const [user] = await db.insert(usersTable).values({ email, username, password: await bcrypt.hash(password, 12), role: "ADMIN" }).returning();
    return res.json({ user: { id: user.id, email: user.email, username: user.username, role: user.role }, success: true });
  } catch (err) { console.error(err); return res.status(500).json({ error: "Internal server error" }); }
});

router.get("/api/admin/topups", async (req, res) => {
  try {
    if (!await requireAdmin(req, res)) return;
    const requests = await db.select({ id: topUpRequestsTable.id, userId: topUpRequestsTable.userId, amount: topUpRequestsTable.amount, transactionRef: topUpRequestsTable.transactionRef, note: topUpRequestsTable.note, status: topUpRequestsTable.status, creditedAmount: topUpRequestsTable.creditedAmount, reviewedAt: topUpRequestsTable.reviewedAt, createdAt: topUpRequestsTable.createdAt, user: { username: usersTable.username, email: usersTable.email }, paymentMethod: { name: paymentMethodsTable.name, nameAr: paymentMethodsTable.nameAr } }).from(topUpRequestsTable).leftJoin(usersTable, eq(topUpRequestsTable.userId, usersTable.id)).leftJoin(paymentMethodsTable, eq(topUpRequestsTable.paymentMethodId, paymentMethodsTable.id)).where(req.query.status ? eq(topUpRequestsTable.status, req.query.status as any) : undefined).orderBy(desc(topUpRequestsTable.createdAt)).limit(100);
    return res.json({ requests });
  } catch (err) { console.error(err); return res.status(500).json({ error: "Internal server error" }); }
});

router.patch("/api/admin/topups/:id", async (req, res) => {
  try {
    const session = await requireAdmin(req, res);
    if (!session) return;
    const { action, creditedAmount } = req.body;
    const [req2] = await db.select().from(topUpRequestsTable).where(eq(topUpRequestsTable.id, req.params.id)).limit(1);
    if (!req2) return res.status(404).json({ error: "Not found" });
    if (action === "approve") {
      const credit = parseFloat(creditedAmount) || req2.amount;
      await db.update(topUpRequestsTable).set({ status: "APPROVED", creditedAmount: credit, reviewedAt: new Date(), reviewedBy: session.userId, updatedAt: new Date() }).where(eq(topUpRequestsTable.id, req.params.id));
      const [u] = await db.select().from(usersTable).where(eq(usersTable.id, req2.userId)).limit(1);
      if (u) await db.update(usersTable).set({ walletBalance: u.walletBalance + credit, updatedAt: new Date() }).where(eq(usersTable.id, req2.userId));
    } else if (action === "reject") {
      await db.update(topUpRequestsTable).set({ status: "REJECTED", reviewedAt: new Date(), reviewedBy: session.userId, updatedAt: new Date() }).where(eq(topUpRequestsTable.id, req.params.id));
    }
    return res.json({ success: true });
  } catch (err) { console.error(err); return res.status(500).json({ error: "Internal server error" }); }
});

router.get("/api/admin/settings", async (req, res) => {
  try {
    if (!await requireAdmin(req, res)) return;
    const [settings, apiConfigs, paymentMethods] = await Promise.all([
      db.select().from(siteSettingsTable),
      db.select().from(apiProviderConfigsTable),
      db.select().from(paymentMethodsTable),
    ]);
    return res.json({ settings: Object.fromEntries(settings.map((s: any) => [s.key, s.value])), apiConfigs, paymentMethods });
  } catch (err) { console.error(err); return res.status(500).json({ error: "Internal server error" }); }
});

router.post("/api/admin/settings", async (req, res) => {
  try {
    if (!await requireAdmin(req, res)) return;
    const { type, data } = req.body;
    if (type === "settings") {
      for (const [key, value] of Object.entries(data as Record<string, string>)) {
        await db.insert(siteSettingsTable).values({ key, value }).onConflictDoUpdate({ target: siteSettingsTable.key, set: { value, updatedAt: new Date() } });
      }
    } else if (type === "payment_method") {
      if (data.id) await db.update(paymentMethodsTable).set({ isActive: data.isActive, updatedAt: new Date() }).where(eq(paymentMethodsTable.id, data.id));
      else await db.insert(paymentMethodsTable).values(data);
    }
    return res.json({ success: true });
  } catch (err) { console.error(err); return res.status(500).json({ error: "Internal server error" }); }
});

router.post("/api/admin/upload-logo", async (req, res) => {
  try {
    if (!await requireAdmin(req, res)) return;
    const { logoData } = req.body;
    if (!logoData) return res.status(400).json({ error: "No logo data" });
    if (logoData.length > 2 * 1024 * 1024) return res.status(400).json({ error: "Logo too large (max 2MB)" });
    await db.insert(siteSettingsTable).values({ key: "logo_data", value: logoData }).onConflictDoUpdate({ target: siteSettingsTable.key, set: { value: logoData, updatedAt: new Date() } });
    return res.json({ success: true });
  } catch (err) { console.error(err); return res.status(500).json({ error: "Internal server error" }); }
});

router.get("/api/public/settings", async (_req, res) => {
  try {
    const settings = await db.select().from(siteSettingsTable);
    const m = Object.fromEntries(settings.map((s: any) => [s.key, s.value]));
    return res.json({ siteName: m.site_name || "HATM", logo: m.logo_data || null, priceMultiplier: parseFloat(m.price_multiplier || "1") });
  } catch (err) { console.error(err); return res.status(500).json({ error: "Internal server error" }); }
});

router.get("/api/admin/analytics", async (req, res) => {
  try {
    if (!await requireAdmin(req, res)) return;
    const [recentOrders, topUsers, allOrders] = await Promise.all([
      db.select({ id: ordersTable.id, pricePaid: ordersTable.pricePaid, profit: ordersTable.profit, status: ordersTable.status, createdAt: ordersTable.createdAt, service: { name: servicesTable.name }, user: { username: usersTable.username } }).from(ordersTable).leftJoin(servicesTable, eq(ordersTable.serviceId, servicesTable.id)).leftJoin(usersTable, eq(ordersTable.userId, usersTable.id)).orderBy(desc(ordersTable.createdAt)).limit(10),
      db.select({ id: usersTable.id, username: usersTable.username, email: usersTable.email, totalSpent: usersTable.totalSpent, walletBalance: usersTable.walletBalance }).from(usersTable).where(eq(usersTable.role, "USER")).orderBy(desc(usersTable.totalSpent)).limit(10),
      db.select({ pricePaid: ordersTable.pricePaid, profit: ordersTable.profit, createdAt: ordersTable.createdAt }).from(ordersTable),
    ]);
    const dailyMap: Record<string, { revenue: number; profit: number }> = {};
    for (const o of allOrders as any[]) { const d = o.createdAt.toISOString().split("T")[0]; if (!dailyMap[d]) dailyMap[d] = { revenue: 0, profit: 0 }; dailyMap[d].revenue += o.pricePaid; dailyMap[d].profit += o.profit; }
    return res.json({ recentOrders, topUsers, dailyData: Object.entries(dailyMap).map(([date, v]) => ({ date, ...v })) });
  } catch (err) { console.error(err); return res.status(500).json({ error: "Internal server error" }); }
});

export default router;
