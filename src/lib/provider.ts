import axios, { AxiosError } from "axios";
import { db, apiProviderConfigsTable } from "../db.js";
import { eq } from "drizzle-orm";

const PROVIDER_TIMEOUT_MS = 15_000;

export interface ProviderConfig {
  id: string;
  apiKey: string;
  baseUrl: string;
  name: string;
}

export class ProviderRequestError extends Error {
  constructor(message: string, public readonly statusCode = 502) {
    super(message);
    this.name = "ProviderRequestError";
  }
}

export async function getDefaultConfig(): Promise<ProviderConfig | null> {
  const [cfg] = await db.select().from(apiProviderConfigsTable).where(eq(apiProviderConfigsTable.isActive, true)).limit(1);
  return cfg ? { id: cfg.id, apiKey: cfg.apiKey, baseUrl: cfg.baseUrl, name: cfg.name } : null;
}

export async function getConfigById(id: string): Promise<ProviderConfig | null> {
  const [cfg] = await db.select().from(apiProviderConfigsTable).where(eq(apiProviderConfigsTable.id, id)).limit(1);
  return cfg ? { id: cfg.id, apiKey: cfg.apiKey, baseUrl: cfg.baseUrl, name: cfg.name } : null;
}

function normalizeProviderUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("Unsupported protocol");
    return url.toString();
  } catch {
    throw new ProviderRequestError("رابط API للمزود غير صالح", 400);
  }
}

function providerErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ error?: string }>;
    if (axiosError.code === "ECONNABORTED") return "انتهت مهلة الاتصال بالمزود. يرجى المحاولة لاحقاً.";
    if (axiosError.response?.status) return `رفض المزود الطلب (HTTP ${axiosError.response.status}).`;
    if (axiosError.message.includes("Network Error")) return "تعذر الوصول إلى المزود. تحقق من الرابط والاتصال.";
  }
  return "تعذر الاتصال بالمزود في الوقت الحالي.";
}

async function apiPost(baseUrl: string, apiKey: string, params: Record<string, unknown>) {
  try {
    const res = await axios.post(normalizeProviderUrl(baseUrl), null, {
      params: { key: apiKey, ...params },
      timeout: PROVIDER_TIMEOUT_MS,
      maxContentLength: 15 * 1024 * 1024,
      maxBodyLength: 15 * 1024 * 1024,
      validateStatus: status => status >= 200 && status < 300,
    });
    return res.data;
  } catch (error) {
    if (error instanceof ProviderRequestError) throw error;
    throw new ProviderRequestError(providerErrorMessage(error));
  }
}

export async function fetchProviderServices(configId?: string): Promise<any[]> {
  const cfg = configId ? await getConfigById(configId) : await getDefaultConfig();
  if (!cfg) throw new ProviderRequestError("لم يتم العثور على مزود نشط أو صالح.", 404);

  const data = await apiPost(cfg.baseUrl, cfg.apiKey, { action: "services" });
  if (!Array.isArray(data)) throw new ProviderRequestError("أعاد المزود استجابة خدمات غير صالحة.");
  return data;
}

export async function placeProviderOrder(serviceId: number, link: string, quantity: number, configId?: string) {
  try {
    const cfg = configId ? await getConfigById(configId) : await getDefaultConfig();
    if (!cfg) return { error: "No provider configured" };
    const data = await apiPost(cfg.baseUrl, cfg.apiKey, { action: "add", service: serviceId, link, quantity });
    return data?.order ? { order: data.order } : { error: data?.error || "Unknown error" };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Provider connection failed" };
  }
}

export async function getProviderOrderStatus(orderId: number, configId?: string) {
  try {
    const cfg = configId ? await getConfigById(configId) : await getDefaultConfig();
    if (!cfg) return null;
    return await apiPost(cfg.baseUrl, cfg.apiKey, { action: "status", order: orderId });
  } catch {
    return null;
  }
}

export async function refillProviderOrder(orderId: number, configId?: string) {
  try {
    const cfg = configId ? await getConfigById(configId) : await getDefaultConfig();
    if (!cfg) return { error: "No provider configured" };
    const data = await apiPost(cfg.baseUrl, cfg.apiKey, { action: "refill", order: orderId });
    return data?.refill ? { refill: data.refill } : { error: data?.error || "Refill failed" };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Provider connection failed" };
  }
}

export async function getProviderBalance(configId?: string): Promise<string> {
  const cfg = configId ? await getConfigById(configId) : await getDefaultConfig();
  if (!cfg) throw new ProviderRequestError("لم يتم العثور على مزود نشط أو صالح.", 404);
  const data = await apiPost(cfg.baseUrl, cfg.apiKey, { action: "balance" });
  if (data?.balance === undefined || data?.balance === null) throw new ProviderRequestError("لم يُرجع المزود رصيداً صالحاً.");
  return String(data.balance);
}

export function mapProviderStatus(status: string): string {
  const map: Record<string, string> = {
    Pending: "PENDING",
    "In progress": "IN_PROGRESS",
    Processing: "IN_PROGRESS",
    Completed: "COMPLETED",
    Partial: "PARTIAL",
    Canceled: "CANCELED",
    Refunded: "REFUNDED",
  };
  return map[status] || "PENDING";
}
