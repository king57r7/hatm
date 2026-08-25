import express, { Request, Response } from "express";
import path from "path";
import { fileURLToPath } from "url";
import pinoHttp from "pino-http";

// routers
import authRouter from "./routes/auth.js";
import servicesRouter from "./routes/services.js";
import ordersRouter from "./routes/orders.js";
import walletRouter from "./routes/wallet.js";
import adminRouter from "./routes/admin.js";
import providersRouter from "./routes/providers.js";
import sectionsRouter from "./routes/sections.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = Number(process.env.PORT || 3000);

// middlewares
app.use(pinoHttp());
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

// health check
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

// API routes
app.use(authRouter);
app.use(servicesRouter);
app.use(ordersRouter);
app.use(walletRouter);
app.use(adminRouter);
app.use(providersRouter);
app.use(sectionsRouter);

// frontend build
const clientDist = path.join(__dirname, "..", "client", "dist");

app.use(express.static(clientDist));

// SPA fallback
app.use((_req: Request, res: Response) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

// start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`King server running on port ${PORT}`);
});
