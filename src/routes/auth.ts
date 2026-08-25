import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable, siteSettingsTable, paymentMethodsTable, apiProviderConfigsTable } from "../db.js";
import { eq, or } from "drizzle-orm";
import { getSession } from "../lib/session.js";

const router = Router();

router.get("/api/auth/me", async (req, res) => {
  try {
    const session = await getSession(req, res);
    if (!session.userId) return res.json({ user: null });
    const [user] = await db.select({ id: usersTable.id, email: usersTable.email, username: usersTable.username, role: usersTable.role, walletBalance: usersTable.walletBalance, totalSpent: usersTable.totalSpent, isBlocked: usersTable.isBlocked }).from(usersTable).where(eq(usersTable.id, session.userId)).limit(1);
    if (!user || user.isBlocked) { await session.destroy(); return res.json({ user: null }); }
    return res.json({ user });
  } catch (err) { console.error(err); return res.status(500).json({ error: "Internal server error" }); }
});

router.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (!user || !await bcrypt.compare(password, user.password)) return res.status(401).json({ error: "Invalid credentials" });
    if (user.isBlocked) return res.status(403).json({ error: "Account blocked" });
    const session = await getSession(req, res);
    session.userId = user.id; session.role = user.role;
    await session.save();
    return res.json({ user: { id: user.id, email: user.email, username: user.username, role: user.role, walletBalance: user.walletBalance, totalSpent: user.totalSpent } });
  } catch (err) { console.error(err); return res.status(500).json({ error: "Internal server error" }); }
});

router.post("/api/auth/register", async (req, res) => {
  try {
    const { email, username, password } = req.body;
    if (!email || !username || !password) return res.status(400).json({ error: "All fields required" });
    const existing = await db.select().from(usersTable).where(or(eq(usersTable.email, email), eq(usersTable.username, username))).limit(1);
    if (existing.length > 0) return res.status(409).json({ error: "Email or username already taken" });
    const hashed = await bcrypt.hash(password, 12);
    const [user] = await db.insert(usersTable).values({ email, username, password: hashed }).returning();
    const session = await getSession(req, res);
    session.userId = user.id; session.role = user.role;
    await session.save();
    return res.json({ user: { id: user.id, email: user.email, username: user.username, role: user.role, walletBalance: 0, totalSpent: 0 } });
  } catch (err) { console.error(err); return res.status(500).json({ error: "Internal server error" }); }
});

router.post("/api/auth/logout", async (req, res) => {
  const session = await getSession(req, res);
  await session.destroy();
  return res.json({ success: true });
});

router.post("/api/auth/change-password", async (req, res) => {
  try {
    const session = await getSession(req, res);
    if (!session.userId) return res.status(401).json({ error: "Unauthorized" });
    const { currentPassword, newPassword } = req.body;
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId)).limit(1);
    if (!user || !await bcrypt.compare(currentPassword, user.password)) return res.status(400).json({ error: "Invalid current password" });
    await db.update(usersTable).set({ password: await bcrypt.hash(newPassword, 12), updatedAt: new Date() }).where(eq(usersTable.id, session.userId));
    return res.json({ success: true });
  } catch (err) { console.error(err); return res.status(500).json({ error: "Internal server error" }); }
});

router.get("/api/auth/init", async (req, res) => {
  try {
    // Gate with SESSION_SECRET so only the deployer (who has env access) can trigger this
    const token = req.query.token as string | undefined;
    if (!token || token !== process.env.SESSION_SECRET) {
      return res.status(403).json({ error: "Forbidden: provide ?token=<SESSION_SECRET> to initialise" });
    }

    const admins = await db.select().from(usersTable).where(eq(usersTable.role, "ADMIN")).limit(1);
    if (admins.length > 0) return res.json({ message: "Already initialized" });

    const existing = await db.select().from(usersTable).where(eq(usersTable.email, "admin@hatm.com")).limit(1);
    if (existing.length === 0) {
      await db.insert(usersTable).values({ email: "admin@hatm.com", username: "admin", password: await bcrypt.hash("admin123", 12), role: "ADMIN" });
    }
    const methods = await db.select().from(paymentMethodsTable).limit(1);
    if (methods.length === 0) {
      await db.insert(paymentMethodsTable).values([
        { name: "USDT TRC20", nameAr: "USDT TRC20", accountInfo: "TYourWalletAddressHere", currency: "USDT", minAmount: 5, maxAmount: 10000, instructions: "Send USDT TRC20 and upload receipt", instructionsAr: "أرسل USDT TRC20 وارفع الإيصال" },
        { name: "Bank Transfer", nameAr: "تحويل بنكي", accountInfo: "Your IBAN or Account Number", currency: "USD", minAmount: 10, maxAmount: 50000, instructions: "Transfer and send receipt", instructionsAr: "حوّل المبلغ وأرسل الإيصال" },
      ]);
    }
    await db.insert(siteSettingsTable).values([
      { key: "site_name", value: "HATM" }, { key: "global_markup", value: "20" }, { key: "price_multiplier", value: "1" },
    ]).onConflictDoNothing();
    return res.json({ success: true, message: "Initialized. Admin: admin@hatm.com / admin123" });
  } catch (err) { console.error(err); return res.status(500).json({ error: "Internal server error" }); }
});

export default router;
