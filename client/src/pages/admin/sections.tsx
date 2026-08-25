import { useEffect, useState } from 'react';
import { useLang } from '../../lib/context';

const ICONS = ['🌐','📱','❤️','👥','📺','🎵','🎮','🛒','📸','🔥','⭐','💎','🚀','🎯','💡','📊','🏆','🎁'];
const COLORS = ['#f59e0b','#3b82f6','#10b981','#8b5cf6','#ef4444','#f97316','#06b6d4','#ec4899','#14b8a6','#a855f7'];

export default function AdminSectionsPage() {
  const { locale } = useLang();
  const [sections, setSections] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [providerServices, setProviderServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [msg, setMsg] = useState('');
  const [loadingServices, setLoadingServices] = useState(false);
  const [form, setForm] = useState({ name: '', nameAr: '', icon: '🌐', color: '#f59e0b', description: '', descriptionAr: '', apiProviderConfigId: '', serviceMode: 'selected', serviceIds: [] as number[], displayOrder: 0, isVisible: true });

  const load = () => {
    setLoading(true);
    Promise.all([
      fetch('/api/sections?admin=true', { credentials: 'include' }).then(r => r.json()),
      fetch('/api/providers', { credentials: 'include' }).then(r => r.json()),
    ]).then(([s, p]) => { setSections(s.sections || []); setProviders(p.providers || []); }).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const loadProviderServices = async (providerId: string) => {
    if (!providerId) { setProviderServices([]); return; }
    setLoadingServices(true);
    const res = await fetch(`/api/providers/${providerId}/services`, { credentials: 'include' });
    const d = await res.json();
    setProviderServices(d.services || []);
    setLoadingServices(false);
  };

  const save = async () => {
    if (!form.name || !form.nameAr) { setMsg('❌ ' + (locale === 'ar' ? 'الاسم مطلوب بالعربي والإنجليزي' : 'Name required in both languages')); return; }
    setMsg('');
    const payload = { ...form, serviceIds: form.serviceIds };
    if (editing) await fetch(`/api/sections/${editing.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(payload) });
    else await fetch('/api/sections', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(payload) });
    setMsg('✅ ' + (locale === 'ar' ? 'تم الحفظ' : 'Saved'));
    setShowForm(false); setEditing(null); load();
  };

  const del = async (id: string) => {
    if (!confirm(locale === 'ar' ? 'هل أنت متأكد؟' : 'Are you sure?')) return;
    await fetch(`/api/sections/${id}`, { method: 'DELETE', credentials: 'include' }); load();
  };

  const toggleVisible = async (s: any) => {
    await fetch(`/api/sections/${s.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ isVisible: !s.isVisible }) }); load();
  };

  const moveOrder = async (s: any, dir: number) => {
    await fetch(`/api/sections/${s.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ displayOrder: s.displayOrder + dir }) }); load();
  };

  const openCreate = () => {
    setEditing(null); setForm({ name: '', nameAr: '', icon: '🌐', color: '#f59e0b', description: '', descriptionAr: '', apiProviderConfigId: '', serviceMode: 'selected', serviceIds: [], displayOrder: sections.length, isVisible: true }); setProviderServices([]); setShowForm(true);
  };

  const openEdit = (s: any) => {
    setEditing(s); const ids = JSON.parse(s.serviceIds || '[]');
    setForm({ name: s.name, nameAr: s.nameAr, icon: s.icon, color: s.color, description: s.description || '', descriptionAr: s.descriptionAr || '', apiProviderConfigId: s.apiProviderConfigId || '', serviceMode: s.serviceMode || 'selected', serviceIds: ids, displayOrder: s.displayOrder, isVisible: s.isVisible });
    if (s.apiProviderConfigId) loadProviderServices(s.apiProviderConfigId); else setProviderServices([]);
    setShowForm(true);
  };

  const toggleServiceId = (id: number) => setForm(f => ({ ...f, serviceIds: f.serviceIds.includes(id) ? f.serviceIds.filter(x => x !== id) : [...f.serviceIds, id] }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{locale === 'ar' ? 'الأقسام والأزرار' : 'Sections & Buttons'}</h1>
          <p className="text-gray-500 text-sm mt-1">{locale === 'ar' ? 'تحكم في الأقسام التي تظهر للمستخدمين في صفحة الخدمات' : 'Control sections shown to users on the services page'}</p>
        </div>
        <button onClick={openCreate} className="btn-primary">+ {locale === 'ar' ? 'إضافة قسم' : 'Add Section'}</button>
      </div>

      {msg && <div className="card-sm text-sm text-amber-400">{msg}</div>}

      {loading ? <div className="text-center py-8 text-gray-500">Loading...</div> :
        sections.length === 0 ? (
          <div className="card text-center py-16">
            <div className="text-5xl mb-3">🗂️</div>
            <p className="text-gray-400">{locale === 'ar' ? 'لا توجد أقسام بعد' : 'No sections yet'}</p>
            <p className="text-gray-600 text-sm mt-2">{locale === 'ar' ? 'أضف قسماً لعرض الخدمات للمستخدمين كأزرار منظمة' : 'Add sections to display services as organized buttons'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sections.sort((a, b) => a.displayOrder - b.displayOrder).map(s => (
              <div key={s.id} className="card">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col gap-1">
                      <button onClick={() => moveOrder(s, -1)} className="text-gray-600 hover:text-white text-xs leading-none">▲</button>
                      <span className="text-gray-600 text-xs text-center">{s.displayOrder}</span>
                      <button onClick={() => moveOrder(s, 1)} className="text-gray-600 hover:text-white text-xs leading-none">▼</button>
                    </div>
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ backgroundColor: s.color + '20', border: `1px solid ${s.color}40` }}>{s.icon}</div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-bold">{locale === 'ar' ? s.nameAr : s.name}</span>
                        <span className={s.isVisible ? 'badge-completed' : 'badge-canceled'}>{s.isVisible ? (locale === 'ar' ? 'مرئي' : 'Visible') : (locale === 'ar' ? 'مخفي' : 'Hidden')}</span>
                      </div>
                      <p className="text-gray-500 text-xs mt-0.5">
                        {s.serviceMode === 'all' ? (locale === 'ar' ? 'جميع الخدمات' : 'All services') : `${JSON.parse(s.serviceIds || '[]').length} ${locale === 'ar' ? 'خدمة محددة' : 'specific services'}`}
                        {s.apiProviderConfigId && ` • ${providers.find((p: any) => p.id === s.apiProviderConfigId)?.name || 'Unknown'}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(s)} className="btn-secondary text-xs px-2 py-1">{locale === 'ar' ? 'تعديل' : 'Edit'}</button>
                    <button onClick={() => toggleVisible(s)} className="btn-secondary text-xs px-2 py-1">{s.isVisible ? (locale === 'ar' ? 'إخفاء' : 'Hide') : (locale === 'ar' ? 'إظهار' : 'Show')}</button>
                    <button onClick={() => del(s.id)} className="btn-danger text-xs px-2 py-1">{locale === 'ar' ? 'حذف' : 'Delete'}</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      }

      {showForm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="card w-full max-w-2xl my-4">
            <h3 className="text-lg font-bold text-white mb-6">{editing ? (locale === 'ar' ? 'تعديل القسم' : 'Edit Section') : (locale === 'ar' ? 'إضافة قسم جديد' : 'Add New Section')}</h3>
            {msg && <div className="mb-3 text-sm text-red-400">{msg}</div>}
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <div><label className="text-gray-400 text-sm block mb-1">{locale === 'ar' ? 'الاسم بالإنجليزي' : 'Name (English)'} *</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input-field" placeholder="Instagram Services" /></div>
              <div><label className="text-gray-400 text-sm block mb-1">{locale === 'ar' ? 'الاسم بالعربي' : 'Name (Arabic)'} *</label><input value={form.nameAr} onChange={e => setForm({ ...form, nameAr: e.target.value })} className="input-field" placeholder="خدمات انستقرام" dir="rtl" /></div>
              <div><label className="text-gray-400 text-sm block mb-1">{locale === 'ar' ? 'الوصف' : 'Description'}</label><input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="input-field" /></div>
              <div><label className="text-gray-400 text-sm block mb-1">{locale === 'ar' ? 'الوصف بالعربي' : 'Description (AR)'}</label><input value={form.descriptionAr} onChange={e => setForm({ ...form, descriptionAr: e.target.value })} className="input-field" dir="rtl" /></div>
            </div>
            <div className="mb-4"><label className="text-gray-400 text-sm block mb-2">{locale === 'ar' ? 'الأيقونة' : 'Icon'}</label>
              <div className="flex flex-wrap gap-2">{ICONS.map(ic => <button key={ic} onClick={() => setForm({ ...form, icon: ic })} className={`w-10 h-10 rounded-lg text-xl transition-all ${form.icon === ic ? 'bg-amber-500/30 border-2 border-amber-500' : 'bg-[#1a1a1a] border border-[#2a2a2a] hover:border-amber-500/50'}`}>{ic}</button>)}</div>
            </div>
            <div className="mb-4"><label className="text-gray-400 text-sm block mb-2">{locale === 'ar' ? 'اللون' : 'Color'}</label>
              <div className="flex gap-2 flex-wrap">{COLORS.map(c => <button key={c} onClick={() => setForm({ ...form, color: c })} className={`w-8 h-8 rounded-lg transition-all ${form.color === c ? 'ring-2 ring-white scale-110' : ''}`} style={{ backgroundColor: c }} />)}</div>
            </div>
            <div className="mb-4"><label className="text-gray-400 text-sm block mb-1">{locale === 'ar' ? 'المزود' : 'Provider'}</label>
              <select value={form.apiProviderConfigId} onChange={e => { setForm({ ...form, apiProviderConfigId: e.target.value, serviceIds: [] }); loadProviderServices(e.target.value); }} className="input-field">
                <option value="">{locale === 'ar' ? 'بدون مزود (من قاعدة البيانات)' : 'No provider (from database)'}</option>
                {providers.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="mb-4"><label className="text-gray-400 text-sm block mb-1">{locale === 'ar' ? 'طريقة عرض الخدمات' : 'Service Display Mode'}</label>
              <div className="flex gap-3">
                <button onClick={() => setForm({ ...form, serviceMode: 'all' })} className={`flex-1 py-2 rounded-lg text-sm border transition-colors ${form.serviceMode === 'all' ? 'bg-amber-500/20 border-amber-500 text-amber-400' : 'bg-[#1a1a1a] border-[#2a2a2a] text-gray-400'}`}>{locale === 'ar' ? '📦 جميع الخدمات' : '📦 All Services'}</button>
                <button onClick={() => setForm({ ...form, serviceMode: 'selected' })} className={`flex-1 py-2 rounded-lg text-sm border transition-colors ${form.serviceMode === 'selected' ? 'bg-amber-500/20 border-amber-500 text-amber-400' : 'bg-[#1a1a1a] border-[#2a2a2a] text-gray-400'}`}>{locale === 'ar' ? '✅ خدمات محددة' : '✅ Selected Services'}</button>
              </div>
            </div>
            {form.serviceMode === 'selected' && (
              <div className="mb-4">
                <label className="text-gray-400 text-sm block mb-2">{locale === 'ar' ? 'اختر الخدمات' : 'Select Services'}</label>
                {form.apiProviderConfigId ? (
                  loadingServices ? <p className="text-gray-500 text-sm">Loading...</p> :
                  providerServices.length === 0 ? <p className="text-gray-500 text-sm">{locale === 'ar' ? 'لا توجد خدمات' : 'No services'}</p> :
                  <div className="max-h-64 overflow-y-auto space-y-1 border border-[#2a2a2a] rounded-lg p-3">
                    {providerServices.map((s: any) => (
                      <label key={s.service} className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#1a1a1a] cursor-pointer">
                        <input type="checkbox" checked={form.serviceIds.includes(s.service)} onChange={() => toggleServiceId(s.service)} className="accent-amber-500 w-4 h-4" />
                        <span className="text-gray-500 text-xs w-12">#{s.service}</span>
                        <span className="text-white text-sm flex-1 truncate">{s.name}</span>
                        <span className="text-amber-500 text-xs">${parseFloat(s.rate).toFixed(4)}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div>
                    <input placeholder={locale === 'ar' ? 'أدخل معرفات مفصولة بفاصلة: 1001,1002' : 'Enter IDs separated by comma: 1001,1002'} value={form.serviceIds.join(',')} onChange={e => { const ids = e.target.value.split(',').map(x => parseInt(x.trim())).filter(x => !isNaN(x)); setForm({ ...form, serviceIds: ids }); }} className="input-field" />
                    <p className="text-gray-600 text-xs mt-1">{locale === 'ar' ? 'مثال: 1001, 1002, 1003' : 'Example: 1001, 1002, 1003'}</p>
                  </div>
                )}
                {form.serviceIds.length > 0 && <p className="text-amber-500 text-xs mt-2">{form.serviceIds.length} {locale === 'ar' ? 'خدمة محددة' : 'selected'}: {form.serviceIds.join(', ')}</p>}
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => { setShowForm(false); setMsg(''); }} className="btn-secondary flex-1">{locale === 'ar' ? 'إلغاء' : 'Cancel'}</button>
              <button onClick={save} className="btn-primary flex-1">{locale === 'ar' ? 'حفظ' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
