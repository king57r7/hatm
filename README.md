# HATM - Arabic SMM Panel

منصة خدمات التسويق الاجتماعي (SMM) مع دعم العربية والإنجليزية.

## متطلبات Railway

### متغيرات البيئة المطلوبة

```env
DATABASE_URL=postgresql://user:password@host:5432/dbname
SESSION_SECRET=your-secret-at-least-32-characters-long
PORT=3000
NODE_ENV=production
```

## خطوات النشر على Railway

1. **ارفع المجلد** `Hatm/` على GitHub
2. **أضف خدمة PostgreSQL** من Railway → Add Service → Database → PostgreSQL
3. **أضف متغير** `SESSION_SECRET` (32 حرف على الأقل)
4. **انتظر البناء** - Railway يشغل تلقائياً: `npm install && npm run build`
5. **شغّل تهيئة قاعدة البيانات** بعد أول نشر:
   - افتح: `https://your-app.railway.app/api/auth/init?token=YOUR_SESSION_SECRET`
   - (استبدل `YOUR_SESSION_SECRET` بقيمة متغير `SESSION_SECRET` الفعلية)
   - هذا ينشئ: الأدمن + طرق الدفع + الإعدادات الافتراضية
6. **تسجيل الدخول** بـ: `admin@hatm.com` / `admin123`

## Build Commands (Railway auto-detects)

```bash
# Build
npm install && npm run build

# Start
npm start

# DB migration (run manually after deploy)
npm run db:push
```

## البنية

```
Hatm/
  src/               # Express backend
    server.ts        # Main server (serves API + static frontend)
    db.ts            # Drizzle ORM + PostgreSQL
    schema.ts        # Database schema
    lib/
      session.ts     # iron-session auth
      provider.ts    # SMM provider API client
    routes/
      auth.ts        # Login, register, init
      services.ts    # Service CRUD + sync
      orders.ts      # Order placement + tracking
      wallet.ts      # Wallet top-up
      admin.ts       # Admin panel APIs
      providers.ts   # Provider management
      sections.ts    # Sections/buttons builder
  client/            # React frontend (Vite)
    src/
      pages/         # All pages (login, dashboard, admin)
      layouts/       # Sidebar layouts
      lib/           # Context, i18n
```

## الميزات

- ✅ مزودو SMM متعددون (إضافة API URL + Key)
- ✅ أقسام/أزرار قابلة للتخصيص
- ✅ مضاعف السعر للعملاء (×2، ×1.5، إلخ)
- ✅ رفع الشعار وتغيير اسم الموقع
- ✅ إضافة أدمن جديد
- ✅ واجهة عربي/إنجليزي مع RTL
- ✅ لوحة أدمن شاملة
- ✅ نظام المحفظة وطلبات الشحن
- ✅ تتبع الطلبات مع المزود

## بيانات الأدمن الافتراضية

```
Email: admin@hatm.com
Password: admin123
```

**يُنصح بتغيير كلمة المرور فور تسجيل الدخول الأول.**
