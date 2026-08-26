import { pgTable, text, doublePrecision, boolean, integer, timestamp, pgEnum, uniqueIndex, index } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["USER", "ADMIN"]);
export const orderStatusEnum = pgEnum("order_status", ["PENDING", "IN_PROGRESS", "COMPLETED", "PARTIAL", "CANCELED", "REFUNDED", "REFILL_AVAILABLE", "FAILED"]);
export const topUpStatusEnum = pgEnum("top_up_status", ["PENDING", "APPROVED", "REJECTED"]);

export const usersTable = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text("email").notNull().unique(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: roleEnum("role").default("USER").notNull(),
  isBlocked: boolean("is_blocked").default(false).notNull(),
  walletBalance: doublePrecision("wallet_balance").default(0).notNull(),
  totalSpent: doublePrecision("total_spent").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const apiProviderConfigsTable = pgTable("api_provider_configs", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  apiKey: text("api_key").notNull(),
  baseUrl: text("base_url").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const servicesTable = pgTable("services", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  providerId: integer("provider_id").notNull(),
  apiProviderConfigId: text("api_provider_config_id").references(() => apiProviderConfigsTable.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  nameAr: text("name_ar"),
  category: text("category").notNull(),
  categoryAr: text("category_ar"),
  description: text("description"),
  descriptionAr: text("description_ar"),
  imageUrl: text("image_url"),
  min: integer("min").notNull(),
  max: integer("max").notNull(),
  basePricePerK: doublePrecision("base_price_per_k").notNull(),
  markupPercent: doublePrecision("markup_percent").default(20).notNull(),
  finalPricePerK: doublePrecision("final_price_per_k").notNull(),
  refill: boolean("refill").default(false).notNull(),
  cancel: boolean("cancel").default(false).notNull(),
  type: text("type"),
  isActive: boolean("is_active").default(true).notNull(),
  isHidden: boolean("is_hidden").default(false).notNull(),
  isFeatured: boolean("is_featured").default(false).notNull(),
  featuredOrder: integer("featured_order").default(0).notNull(),
  note: text("note"),
  noteAr: text("note_ar"),
  syncedAt: timestamp("synced_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  providerSourceUnique: uniqueIndex("services_provider_source_unique").on(table.apiProviderConfigId, table.providerId),
  featuredLookup: index("services_featured_lookup").on(table.isFeatured, table.featuredOrder),
}));

export const bannersTable = pgTable("banners", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  titleAr: text("title_ar"),
  subtitle: text("subtitle"),
  subtitleAr: text("subtitle_ar"),
  imageUrl: text("image_url"),
  actionUrl: text("action_url"),
  actionLabel: text("action_label"),
  actionLabelAr: text("action_label_ar"),
  accentColor: text("accent_color").default("#64748b").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  displayOrder: integer("display_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const sectionsTable = pgTable("sections", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  nameAr: text("name_ar").notNull(),
  icon: text("icon").default("🌐").notNull(),
  color: text("color").default("#f59e0b").notNull(),
  imageUrl: text("image_url"),
  description: text("description"),
  descriptionAr: text("description_ar"),
  apiProviderConfigId: text("api_provider_config_id").references(() => apiProviderConfigsTable.id, { onDelete: "set null" }),
  serviceMode: text("service_mode").default("selected").notNull(),
  serviceIds: text("service_ids").default("[]").notNull(),
  displayOrder: integer("display_order").default(0).notNull(),
  isVisible: boolean("is_visible").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const ordersTable = pgTable("orders", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  serviceId: text("service_id").notNull().references(() => servicesTable.id),
  providerOrderId: integer("provider_order_id"),
  link: text("link").notNull(),
  quantity: integer("quantity").notNull(),
  pricePaid: doublePrecision("price_paid").notNull(),
  purchaseCost: doublePrecision("purchase_cost").notNull(),
  profit: doublePrecision("profit").notNull(),
  status: orderStatusEnum("status").default("PENDING").notNull(),
  startCount: integer("start_count"),
  remains: integer("remains"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const paymentMethodsTable = pgTable("payment_methods", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  nameAr: text("name_ar").notNull(),
  description: text("description"),
  descriptionAr: text("description_ar"),
  accountInfo: text("account_info").notNull(),
  instructions: text("instructions"),
  instructionsAr: text("instructions_ar"),
  currency: text("currency").default("USD").notNull(),
  conversionRate: doublePrecision("conversion_rate").default(1).notNull(),
  minAmount: doublePrecision("min_amount").default(1).notNull(),
  maxAmount: doublePrecision("max_amount").default(10000).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const topUpRequestsTable = pgTable("top_up_requests", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  paymentMethodId: text("payment_method_id").notNull().references(() => paymentMethodsTable.id),
  amount: doublePrecision("amount").notNull(),
  transactionRef: text("transaction_ref").notNull(),
  note: text("note"),
  status: topUpStatusEnum("status").default("PENDING").notNull(),
  creditedAmount: doublePrecision("credited_amount"),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: text("reviewed_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const siteSettingsTable = pgTable("site_settings", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
