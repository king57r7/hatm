import { Router } from "express";
import { db, paymentMethodsTable, topUpRequestsTable, usersTable } from "../db.js";
import { eq, desc } from "drizzle-orm";
import { getSession } from "../lib/session.js";

const router = Router();

router.get("/api/wallet/methods", async (req, res) => {
  try {
    const session = await getSession(req, res);
    if (!session.userId) return res.status(401).json({ error: "Unauthorized" });
    const methods = await db.select().from(paymentMethodsTable).where(eq(paymentMethodsTable.isActive, true));
    return res.json({ methods });
  } catch { return res.status(500).json({ error: "Internal server error" }); }
});

router.post("/api/wallet/topup", async (req, res) => {
  try {
    const session = await getSession(req, res);
    if (!session.userId) return res.status(401).json({ error: "Unauthorized" });
    const { paymentMethodId, amount, transactionRef, note } = req.body;
    if (!paymentMethodId || !amount || !transactionRef) return res.status(400).json({ error: "All fields required" });
    const [method] = await db.select().from(paymentMethodsTable).where(eq(paymentMethodsTable.id, paymentMethodId)).limit(1);
    if (!method) return res.status(404).json({ error: "Payment method not found" });
    if (amount < method.minAmount || amount > method.maxAmount) return res.status(400).json({ error: `Amount must be ${method.minAmount}-${method.maxAmount}` });
    const [request] = await db.insert(topUpRequestsTable).values({ userId: session.userId, paymentMethodId, amount, transactionRef, note }).returning();
    return res.json({ request });
  } catch { return res.status(500).json({ error: "Internal server error" }); }
});

router.get("/api/wallet/topups", async (req, res) => {
  try {
    const session = await getSession(req, res);
    if (!session.userId) return res.status(401).json({ error: "Unauthorized" });
    const requests = await db.select({ id: topUpRequestsTable.id, amount: topUpRequestsTable.amount, transactionRef: topUpRequestsTable.transactionRef, note: topUpRequestsTable.note, status: topUpRequestsTable.status, creditedAmount: topUpRequestsTable.creditedAmount, reviewedAt: topUpRequestsTable.reviewedAt, createdAt: topUpRequestsTable.createdAt, paymentMethod: { name: paymentMethodsTable.name, nameAr: paymentMethodsTable.nameAr } }).from(topUpRequestsTable).leftJoin(paymentMethodsTable, eq(topUpRequestsTable.paymentMethodId, paymentMethodsTable.id)).where(eq(topUpRequestsTable.userId, session.userId)).orderBy(desc(topUpRequestsTable.createdAt));
    return res.json({ requests });
  } catch { return res.status(500).json({ error: "Internal server error" }); }
});

export default router;
