import { useEffect, useRef, useState } from 'react';
import { useLang, useSite } from '../../lib/context';

export default function AdminSettingsPage() {
  const { t, locale } = useLang();
  const { refreshConfig } = useSite();
  const [methods, setMethods] = useState<any[]>([]);
  const [newMethod, setNewMethod] = useState({ name: '', nameAr: '', accountInfo: '', currency: 'USD', minAmount: 5, maxAmount: 10000, isActive: true, instructions: '', instructionsAr: '' });
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [siteName, setSiteName] = useState('HATM');
  const [multiplier, setMultiplier] = useState('1');
  const [markup, setMarkup] = useState('20');
  const [adminForm, setAdminForm] = useState({ email: '', username: '', password: '' });
  const [adminMsg, setAdminMsg] = useState('');
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);

  const load = () => {
    setLoading(true);
    fetch('/api/admin/settings', { credentials: 'include' }).then(r => r.json()).then(d => {
      setSiteName(d.settings?.site_name || 'HATM');
      setMultiplier(d.settings?.price_multiplier || '1');
      setMarkup(d.settings?.global_markup || '20');
      setLogoPreview(d.settings?.logo_data || null);
      setMethods(d.paymentMethods || []);
    }).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const save = async (type: string, data: unknown) => {
    const res = await fetch('/api/admin/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ type, data }) });
    const d = await res.json();
    if (res.ok) { setMsg('✅ ' + t.success); refreshConfig(); load(); } else setMsg('❌ ' + d.error);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setMsg('❌ ' + (locale === 'ar' ? 'يجب أن يكون ملف صورة' : 'Must be an image file')); return; }
    if (file.size > 1.5 * 1024 * 1024) { setMsg('❌ ' + (locale === 'ar' ? 'الصورة كبيرة جداً (الحد الأقصى 1.5MB)' : 'Image too large (max 1.5MB)')); return; }
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      setLogoPreview(dataUrl);
      setLogoUploading(true);
      try {
        const res = await fetch('/api/admin/upload-logo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ logoData: dataUrl }) });
        const d = await res.json();
        if (res.ok) { setMsg('✅ ' + (locale === 'ar' ? 'تم رفع الشعار' : 'Logo uploaded')); refreshConfig(); }
        else setMsg('❌ ' + d.error);
      } finally { setLogoUploading(false); }
    };
    reader.readAsDataURL(file);
  };

  const createAdmin = async (e: React.FormEvent) => {
    e.preventDefault(); setAdminMsg('');
    const res = await fetch('/api/admin/create-admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(adminForm) });
    const d = await res.json();
    if (res.ok) { setAdminMsg('✅ ' + (locale === 'ar' ? `تم إنشاء الأدمن: ${adminForm.email}` : `Admin created: ${adminForm.email}`)); setAdminForm({ email: '', username: '', password: '' }); }
    else setAdminMsg('❌ ' + d.error);
  };

  const toggleMethod = async (id: string, isActive: boolean) => {
    await fetch('/api/admin/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ type: 'payment_method', data: { id, isActive } }) });
    load();
  };

  if (loading) return <div className="text-center py-12 text-gray-500">{t.loading}</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">{t.settings}</h1>
      {msg && <div className="card-sm text-sm text-amber-400">{msg}</div>}

      <div className="card">
        <h2 className="text-lg font-bold text-white mb-4">{locale === 'ar' ? '🎨 هوية الموقع' : '🎨 Site Branding'}</h2>
        <div className="grid sm:grid-cols-2 gap-6">
          <div>
            <label className="text-gray-400 text-sm block mb-2">{locale === 'ar' ? 'شعار الموقع (Logo)' : 'Site Logo'}</label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center overflow-hidden">
                {logoPreview ? <img src={logoPreview} alt="logo" className="w-full h-full object-cover" /> : <span className="text-amber-500 font-black text-3xl">{siteName[0]?.toUpperCase() || 'H'}</span>}
              </div>
              <div>
                <input type="file" ref={logoInputRef} accept="image/*" onChange={handleLogoUpload} className="hidden" />
                <button onClick={() => logoInputRef.current?.click()} disabled={logoUploading} className="btn-secondary text-sm">
                  {logoUploading ? (locale === 'ar' ? 'جارٍ الرفع...' : 'Uploading...') : (locale === 'ar' ? '📤 رفع صورة' : '📤 Upload Image')}
                </button>
                <p className="text-gray-600 text-xs mt-1">{locale === 'ar' ? 'PNG, JPG — حتى 1.5MB' : 'PNG, JPG — up to 1.5MB'}</p>
              </div>
            </div>
          </div>
          <div>
            <label className="text-gray-400 text-sm block mb-2">{locale === 'ar' ? 'اسم الموقع' : 'Site Name'}</label>
            <input value={siteName} onChange={e => setSiteName(e.target.value)} className="input-field" placeholder="HATM" />
          </div>
        </div>
        <button className="btn-primary mt-4" onClick={() => save('settings', { site_name: siteName })}>
          {locale === 'ar' ? 'حفظ الاسم' : 'Save Name'}
        </button>
      </div>

      <div className="card">
        <h2 className="text-lg font-bold text-white mb-4">{locale === 'ar' ? '💰 إعدادات الأسعار' : '💰 Pricing Settings'}</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="text-gray-400 text-sm block mb-1">{locale === 'ar' ? 'مضاعف السعر (×)' : 'Price Multiplier (×)'}</label>
            <p className="text-gray-600 text-xs mb-2">{locale === 'ar' ? 'مثال: 2 يعني السعر × 2 للعميل' : 'Example: 2 means price × 2 for customer'}</p>
            <input type="number" value={multiplier} onChange={e => setMultiplier(e.target.value)} step="0.1" min="1" className="input-field" placeholder="1" />
          </div>
          <div>
            <label className="text-gray-400 text-sm block mb-1">{t.globalMarkup} (%)</label>
            <p className="text-gray-600 text-xs mb-2">{locale === 'ar' ? 'يُستخدم عند المزامنة' : 'Used during service sync'}</p>
            <input type="number" value={markup} onChange={e => setMarkup(e.target.value)} className="input-field" placeholder="20" />
          </div>
        </div>
        <button className="btn-primary mt-4" onClick={() => save('settings', { price_multiplier: multiplier, global_markup: markup })}>
          {locale === 'ar' ? 'حفظ الأسعار' : 'Save Pricing'}
        </button>
      </div>

      <div className="card">
        <h2 className="text-lg font-bold text-white mb-4">{locale === 'ar' ? '👤 إضافة أدمن جديد' : '👤 Add New Admin'}</h2>
        {adminMsg && <div className="mb-3 text-sm bg-[#1a1a1a] px-4 py-3 rounded-lg text-amber-400">{adminMsg}</div>}
        <form onSubmit={createAdmin} className="space-y-3">
          <div className="grid sm:grid-cols-3 gap-3">
            <input type="email" value={adminForm.email} onChange={e => setAdminForm({ ...adminForm, email: e.target.value })} placeholder={t.email} className="input-field" required />
            <input value={adminForm.username} onChange={e => setAdminForm({ ...adminForm, username: e.target.value })} placeholder={t.username} className="input-field" required />
            <input type="password" value={adminForm.password} onChange={e => setAdminForm({ ...adminForm, password: e.target.value })} placeholder={t.password} className="input-field" required minLength={6} />
          </div>
          <button type="submit" className="btn-primary">{locale === 'ar' ? 'إنشاء أدمن' : 'Create Admin'}</button>
        </form>
      </div>

      <div className="card">
        <h2 className="text-lg font-bold text-white mb-4">{t.paymentMethods}</h2>
        <div className="space-y-3 mb-6">
          {methods.map(m => (
            <div key={m.id} className="card-sm flex items-center justify-between">
              <div>
                <p className="text-white font-medium">{locale === 'ar' ? m.nameAr : m.name}</p>
                <p className="text-gray-500 text-sm font-mono">{m.accountInfo}</p>
                <p className="text-gray-600 text-xs">{m.currency} | ${m.minAmount} - ${m.maxAmount}</p>
              </div>
              <button onClick={() => toggleMethod(m.id, !m.isActive)} className={m.isActive ? 'btn-danger text-xs px-2 py-1' : 'btn-success text-xs px-2 py-1'}>
                {m.isActive ? t.inactive : t.active}
              </button>
            </div>
          ))}
        </div>
        <h3 className="text-white font-semibold mb-3">{t.addPaymentMethod}</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <input value={newMethod.name} onChange={e => setNewMethod({ ...newMethod, name: e.target.value })} placeholder={locale === 'ar' ? 'الاسم بالإنجليزي' : 'Name (EN)'} className="input-field" />
          <input value={newMethod.nameAr} onChange={e => setNewMethod({ ...newMethod, nameAr: e.target.value })} placeholder="الاسم بالعربي" className="input-field" dir="rtl" />
          <input value={newMethod.accountInfo} onChange={e => setNewMethod({ ...newMethod, accountInfo: e.target.value })} placeholder={t.accountInfo} className="input-field sm:col-span-2" />
          <input value={newMethod.instructions} onChange={e => setNewMethod({ ...newMethod, instructions: e.target.value })} placeholder={`${t.instructions} (EN)`} className="input-field" />
          <input value={newMethod.instructionsAr} onChange={e => setNewMethod({ ...newMethod, instructionsAr: e.target.value })} placeholder="التعليمات بالعربي" className="input-field" dir="rtl" />
          <input type="number" value={newMethod.minAmount} onChange={e => setNewMethod({ ...newMethod, minAmount: parseFloat(e.target.value) })} placeholder={`${t.min} $`} className="input-field" />
          <input type="number" value={newMethod.maxAmount} onChange={e => setNewMethod({ ...newMethod, maxAmount: parseFloat(e.target.value) })} placeholder={`${t.max} $`} className="input-field" />
          <input value={newMethod.currency} onChange={e => setNewMethod({ ...newMethod, currency: e.target.value })} placeholder={t.currency} className="input-field" />
        </div>
        <button className="btn-primary mt-4" onClick={() => save('payment_method', newMethod)}>{t.addPaymentMethod}</button>
      </div>
    </div>
  );
}
