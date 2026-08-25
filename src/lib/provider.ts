import axios from "axios";
import { db, apiProviderConfigsTable } from "../db.js";
import { eq } from "drizzle-orm";

export interface ProviderConfig { id: string; apiKey: string; baseUrl: string; name: string; }

export async function getDefaultConfig(): Promise<ProviderConfig | null> {
  const [cfg] = await db.select().from(apiProviderConfigsTable).where(eq(apiProviderConfigsTable.isActive, true)).limit(1);
  return cfg ? { id: cfg.id, apiKey: cfg.apiKey, baseUrl: cfg.baseUrl, name: cfg.name } : null;
}

export async function getConfigById(id: string): Promise<ProviderConfig | null> {
  const [cfg] = await db.select().from(apiProviderConfigsTable).where(eq(apiProviderConfigsTable.id, id)).limit(1);
  return cfg ? { id: cfg.id, apiKey: cfg.apiKey, baseUrl: cfg.baseUrl, name: cfg.name } : null;
}

async function apiPost(baseUrl: string, apiKey: string, params: Record<string, unknown>) {
  const res = await axios.post(baseUrl, null, { params: { key: apiKey, ...params }, timeout: 30000 });
  return res.data;
}

export async function fetchProviderServices(configId?: string) {
  try {
    const cfg = configId ? await getConfigById(configId) : await getDefaultConfig();
    if (!cfg) return [];
    const data = await apiPost(cfg.baseUrl, cfg.apiKey, { action: "services" });
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}

export async function fetchProviderServicesByIds(providerServiceIds: number[], configId: string) {
  const all = await fetchProviderServices(configId);
  const ids = new Set(providerServiceIds);
  return all.filter((s: any) => ids.has(s.service));
}

export async function placeProviderOrder(serviceId: number, link: string, quantity: number, configId?: string) {
  try {
    const cfg = configId ? await getConfigById(configId) : await getDefaultConfig();
    if (!cfg) return { error: "No provider configured" };
    const data = await apiPost(cfg.baseUrl, cfg.apiKey, { action: "add", service: serviceId, link, quantity });
    return data?.order ? { order: data.order } : { error: data?.error || "Unknown error" };
  } catch { return { error: "Provider connection failed" }; }
}

export async function getProviderOrderStatus(orderId: number, configId?: string) {
  try {
    const cfg = configId ? await getConfigById(configId) : await getDefaultConfig();
    if (!cfg) return null;
    return await apiPost(cfg.baseUrl, cfg.apiKey, { action: "status", order: orderId });
  } catch { return null; }
}

export async function refillProviderOrder(orderId: number, configId?: string) {
  try {
    const cfg = configId ? await getConfigById(configId) : await getDefaultConfig();
    if (!cfg) return { error: "No provider configured" };
    const data = await apiPost(cfg.baseUrl, cfg.apiKey, { action: "refill", order: orderId });
    return data?.refill ? { refill: data.refill } : { error: data?.error || "Refill failed" };
  } catch { return { error: "Provider connection failed" }; }
}

export async function getProviderBalance(configId?: string): Promise<string> {
  try {
    const cfg = configId ? await getConfigById(configId) : await getDefaultConfig();
    if (!cfg) return "0";
    const data = await apiPost(cfg.baseUrl, cfg.apiKey, { action: "balance" });
    return data?.balance || "0";
  } catch { return "0"; }
}

export function mapProviderStatus(status: string): string {
  const map: Record<string, string> = { Pending: "PENDING", "In progress": "IN_PROGRESS", Processing: "IN_PROGRESS", Completed: "COMPLETED", Partial: "PARTIAL", Canceled: "CANCELED", Refunded: "REFUNDED" };
  return map[status] || "PENDING";
}
