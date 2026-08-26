import { useEffect, useState } from 'react';
import { useLang } from '../../lib/context';

export default function AdminProvidersPage() {
  const { locale } = useLang();
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: '', apiKey: '', baseUrl: '' });
  const [msg, setMsg] = useState('');
  const [testing, setTesting] = useState<string | null>(null);
  const [balances, setBalances] = useState<Record<string, string>>({});
  const [syncing, setSyncing] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    fetch('/api/providers', { credentials: 'include' }).then(r => r.json()).then(d => setProviders(d.providers || [])).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const save = async () => {
    if (!form.name || !form.apiKey || !form.baseUrl) { setMsg('❌ ' + (locale === 'ar' ? 'جميع الحقول مطلوبة' : 'All fields required')); return; }
    setMsg('');
    if (editing) await fetch(`/api/providers/${editing.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(form) });
    else await fetch('/api/providers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(form) });
    setMsg('✅ ' + (editing ? (locale === 'ar' ? 'تم التحديث' : 'Updated') : (locale === 'ar' ? 'تمت الإضافة' : 'Added')));
    setForm({ name: '', apiKey: '', baseUrl: '' }); setShowForm(false); setEditing(null); load();
  };

  const del = async (id: string) => {
    if (!confirm(locale === 'ar' ? 'هل أنت متأكد؟' : 'Are you sure?')) return;
    await fetch(`/api/providers/${id}`, { method: 'DELETE', credentials: 'include' }); load();
  };

  const toggleActive = async (p: any) => {
    await fetch(`/api/providers/${p.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ isActive: !p.isActive }) }); load();
  };

  const testBalance = async (id: string) => {
    setTesting(id);
    try {
      const res = await fetch(`/api/providers/${id}/balance`, { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Connection failed');
      setBalances(prev => ({ ...prev, [id]: data.balance || '—' }));
    } catch (error) {
      setMsg(`❌ ${error instanceof Error ? error.message : (locale === 'ar' ? 'تعذر اختبار اتصال المزود' : 'Provider test failed')}`);
    } finally {
      setTesting(null);
    }
  };

  const syncServices = async (id: string) => {
    setSyncing(id);
    setMsg(locale === 'ar' ? 'جارٍ جلب الكتالوج وحفظه محلياً. يمكنك البقاء في الصفحة حتى تكتمل العملية.' : 'Fetching the catalog and saving it locally. You can stay on this page while it finishes.');
    try {
      const res = await fetch('/api/services/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ apiProviderConfigId: id }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sync failed');
      const duration = Number(data.durationMs || 0);
      setMsg(`✅ ${locale === 'ar' ? `اكتملت المزامنة: ${data.created} جديد، ${data.updated} محدث${data.skipped ? `، ${data.skipped} تم تجاوزها لبيانات غير صالحة` : ''}${duration ? ` خلال ${(duration / 1000).toFixed(1)} ثانية` : ''}` : `Sync complete: ${data.created} new, ${data.updated} updated${data.skipped ? `, ${data.skipped} skipped` : ''}${duration ? ` in ${(duration / 1000).toFixed(1)}s` : ''}`}`);
    } catch (error) {
      setMsg(`❌ ${error instanceof Error ? error.message : (locale === 'ar' ? 'تعذرت مزامنة الخدمات' : 'Service sync failed')}`);
    } finally {
      setSyncing(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{locale === 'ar' ? 'المزودون' : 'Providers'}</h1>
          <p className="text-gray-500 text-sm mt-1">{locale === 'ar' ? 'أضف مزودي خدمات SMM وربطهم بالموقع' : 'Add SMM service providers and link them to your site'}</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditing(null); setForm({ name: '', apiKey: '', baseUrl: 'https://boostprovider.com/api/v2' }); }} className="btn-primary">
          + {locale === 'ar' ? 'إضافة مزود' : 'Add Provider'}
        </button>
      </div>

      {msg && <div className="notice-bar">{msg}</div>}

      {loading ? <div className="text-center py-8 text-gray-500">Loading...</div> :
        providers.length === 0 ? (
          <div className="card text-center py-12">
            <div className="text-5xl mb-3">🔌</div>
            <p className="text-gray-400">{locale === 'ar' ? 'لا يوجد مزودون بعد' : 'No providers yet'}</p>
            <p className="text-gray-600 text-sm mt-2">{locale === 'ar' ? 'أضف مزوداً لبدء استيراد الخدمات' : 'Add a provider to start importing services'}</p>
          </div>
        ) :
        providers.map(p => (
          <div key={p.id} className="card">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-white font-bold text-lg">{p.name}</span>
                  <span className={p.isActive ? 'badge-completed' : 'badge-failed'}>{p.isActive ? (locale === 'ar' ? 'نشط' : 'Active') : (locale === 'ar' ? 'معطل' : 'Inactive')}</span>
                </div>
                <p className="text-gray-500 text-sm font-mono truncate">{p.baseUrl}</p>
                <p className="text-gray-600 text-xs font-mono mt-1">{p.apiKey.substring(0, 20)}...</p>
                {balances[p.id] && <p className="text-amber-500 text-sm mt-1">{locale === 'ar' ? 'الرصيد:' : 'Balance:'} ${balances[p.id]}</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => testBalance(p.id)} disabled={testing === p.id} className="btn-secondary text-xs px-3 py-1.5">{testing === p.id ? '...' : (locale === 'ar' ? '🔍 اختبار' : '🔍 Test')}</button>
                <button onClick={() => syncServices(p.id)} disabled={syncing === p.id} className="btn-secondary text-xs px-3 py-1.5">{syncing === p.id ? (locale === 'ar' ? 'جارٍ الحفظ...' : 'Saving...') : (locale === 'ar' ? 'مزامنة الخدمات' : 'Sync services')}</button>
                <button onClick={() => { setEditing(p); setForm({ name: p.name, apiKey: p.apiKey, baseUrl: p.baseUrl }); setShowForm(true); }} className="btn-secondary text-xs px-3 py-1.5">{locale === 'ar' ? '✏️ تعديل' : '✏️ Edit'}</button>
                <button onClick={() => toggleActive(p)} className={`text-xs px-3 py-1.5 rounded-lg ${p.isActive ? 'btn-danger' : 'btn-success'}`}>{p.isActive ? (locale === 'ar' ? 'تعطيل' : 'Disable') : (locale === 'ar' ? 'تفعيل' : 'Enable')}</button>
                <button onClick={() => del(p.id)} className="btn-danger text-xs px-3 py-1.5">🗑️</button>
              </div>
            </div>
          </div>
        ))
      }

      {showForm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-lg">
            <h3 className="text-lg font-bold text-white mb-4">{editing ? (locale === 'ar' ? 'تعديل المزود' : 'Edit Provider') : (locale === 'ar' ? 'إضافة مزود جديد' : 'Add New Provider')}</h3>
            {msg && <div className="mb-3 text-sm text-red-400">{msg}</div>}
            <div className="space-y-3">
              <div><label className="text-gray-400 text-sm block mb-1">{locale === 'ar' ? 'اسم المزود' : 'Provider Name'}</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="BoostProvider" className="input-field" /></div>
              <div><label className="text-gray-400 text-sm block mb-1">{locale === 'ar' ? 'رابط API' : 'API URL'}</label><input value={form.baseUrl} onChange={e => setForm({ ...form, baseUrl: e.target.value })} placeholder="https://provider.com/api/v2" className="input-field font-mono" /></div>
              <div><label className="text-gray-400 text-sm block mb-1">{locale === 'ar' ? 'مفتاح API' : 'API Key'}</label><input value={form.apiKey} onChange={e => setForm({ ...form, apiKey: e.target.value })} placeholder="your-api-key" className="input-field font-mono" /></div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => { setShowForm(false); setEditing(null); setMsg(''); }} className="btn-secondary flex-1">{locale === 'ar' ? 'إلغاء' : 'Cancel'}</button>
              <button onClick={save} className="btn-primary flex-1">{locale === 'ar' ? 'حفظ' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
