import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Boxes, Check, ChevronDown, ChevronUp, Eye, EyeOff, ImagePlus, Layers3,
  ListChecks, Loader2, Pencil, Search, SlidersHorizontal, Tags, Trash2, X,
} from 'lucide-react';
import { useLang } from '../../lib/context';

const ICONS = ['🌐', '📱', '❤️', '👥', '📺', '🎵', '🎮', '🛒', '📸', '🔥', '⭐', '💎', '🚀', '🎯', '💡', '📊', '🏆', '🎁'];
const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#f97316', '#06b6d4', '#ec4899', '#14b8a6', '#a855f7'];
const PICKER_PAGE_SIZE = 40;
const MAX_SELECT_ALL_MATCHING = 4000;
const MAX_IMAGE_BYTES = 1.5 * 1024 * 1024;

type ServiceRow = { id: string; providerId: number; name: string; nameAr?: string | null; category: string; displayPricePerK?: number; finalPricePerK?: number; imageUrl?: string | null };

const emptyForm = () => ({
  name: '', nameAr: '', icon: '🌐', color: '#f59e0b', imageUrl: '',
  description: '', descriptionAr: '', apiProviderConfigId: '',
  serviceMode: 'selected' as 'all' | 'selected', serviceIds: [] as number[],
  displayOrder: 0, isVisible: true,
});

export default function AdminSectionsPage() {
  const { locale } = useLang();
  const [sections, setSections] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [msg, setMsg] = useState<{ text: string; success: boolean } | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [imageError, setImageError] = useState('');

  // Service picker state
  const [pickerResults, setPickerResults] = useState<ServiceRow[]>([]);
  const [pickerCategories, setPickerCategories] = useState<string[]>([]);
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerCategory, setPickerCategory] = useState('');
  const [pickerPage, setPickerPage] = useState(1);
  const [pickerTotalPages, setPickerTotalPages] = useState(1);
  const [pickerTotal, setPickerTotal] = useState(0);
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerBulkBusy, setPickerBulkBusy] = useState(false);
  const [selectedMeta, setSelectedMeta] = useState<Record<number, ServiceRow>>({});
  const [showSelectedPanel, setShowSelectedPanel] = useState(false);

  const text = (ar: string, en: string) => (locale === 'ar' ? ar : en);

  const load = () => {
    setLoading(true);
    Promise.all([
      fetch('/api/sections?admin=true', { credentials: 'include' }).then(r => r.json()),
      fetch('/api/providers', { credentials: 'include' }).then(r => r.json()),
    ]).then(([s, p]) => { setSections(s.sections || []); setProviders(p.providers || []); }).finally(() => setLoading(false));
  };

  useEffect(load, []);

  // Debounced picker search, refetches whenever a filter changes while the form is open.
  useEffect(() => {
    if (!showForm || form.serviceMode !== 'selected') return;
    const timer = window.setTimeout(() => {
      setPickerLoading(true);
      const params = new URLSearchParams({ admin: 'true', page: String(pickerPage), pageSize: String(PICKER_PAGE_SIZE) });
      if (pickerSearch.trim()) params.set('search', pickerSearch.trim());
      if (pickerCategory) params.set('category', pickerCategory);
      if (form.apiProviderConfigId) params.set('provider', form.apiProviderConfigId);
      fetch(`/api/services?${params}`, { credentials: 'include' }).then(r => r.json()).then(data => {
        setPickerResults(data.services || []);
        setPickerCategories(data.categories || []);
        setPickerTotalPages(data.totalPages || 1);
        setPickerTotal(data.total || 0);
      }).finally(() => setPickerLoading(false));
    }, pickerSearch ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [showForm, form.serviceMode, form.apiProviderConfigId, pickerSearch, pickerCategory, pickerPage]);

  useEffect(() => { setPickerPage(1); }, [pickerSearch, pickerCategory, form.apiProviderConfigId]);

  // When editing a section that already has selected services, resolve their
  // names/categories up-front so the "selected" list isn't just a wall of numbers.
  const resolveSelectedMeta = async (ids: number[]) => {
    if (!ids.length) return;
    const params = new URLSearchParams({ admin: 'true', pageSize: '1000', ids: ids.join(',') });
    const res = await fetch(`/api/services?${params}`, { credentials: 'include' });
    const data = await res.json();
    const map: Record<number, ServiceRow> = {};
    (data.services || []).forEach((s: ServiceRow) => { map[s.providerId] = s; });
    setSelectedMeta(prev => ({ ...prev, ...map }));
  };

  const save = async () => {
    if (!form.name.trim() || !form.nameAr.trim()) { setMsg({ success: false, text: text('الاسم مطلوب بالعربي والإنجليزي', 'Name required in both languages') }); return; }
    setSaving(true);
    try {
      const payload = { ...form };
      const res = editing
        ? await fetch(`/api/sections/${editing.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(payload) })
        : await fetch('/api/sections', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) { setMsg({ success: false, text: data.error || text('تعذر الحفظ', 'Could not save') }); return; }
      setMsg({ success: true, text: text('تم الحفظ بنجاح', 'Saved successfully') });
      setShowForm(false); setEditing(null); load();
    } finally {
      setSaving(false);
    }
  };

  const del = async (id: string) => {
    if (!confirm(text('هل أنت متأكد من حذف هذا القسم؟', 'Delete this section?'))) return;
    await fetch(`/api/sections/${id}`, { method: 'DELETE', credentials: 'include' }); load();
  };

  const toggleVisible = async (s: any) => {
    await fetch(`/api/sections/${s.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ isVisible: !s.isVisible }) }); load();
  };

  const moveOrder = async (s: any, dir: number) => {
    await fetch(`/api/sections/${s.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ displayOrder: s.displayOrder + dir }) }); load();
  };

  const resetPicker = () => { setPickerSearch(''); setPickerCategory(''); setPickerPage(1); setPickerResults([]); };

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm(), displayOrder: sections.length });
    setSelectedMeta({});
    setImageError('');
    resetPicker();
    setMsg(null);
    setShowForm(true);
  };

  const openEdit = (s: any) => {
    setEditing(s);
    const ids: number[] = JSON.parse(s.serviceIds || '[]');
    setForm({
      name: s.name, nameAr: s.nameAr, icon: s.icon, color: s.color, imageUrl: s.imageUrl || '',
      description: s.description || '', descriptionAr: s.descriptionAr || '',
      apiProviderConfigId: s.apiProviderConfigId || '', serviceMode: s.serviceMode || 'selected',
      serviceIds: ids, displayOrder: s.displayOrder, isVisible: s.isVisible,
    });
    setSelectedMeta({});
    setImageError('');
    resetPicker();
    if (ids.length) resolveSelectedMeta(ids);
    setMsg(null);
    setShowForm(true);
  };

  const toggleServiceId = (service: ServiceRow) => {
    setForm(f => {
      const has = f.serviceIds.includes(service.providerId);
      return { ...f, serviceIds: has ? f.serviceIds.filter(x => x !== service.providerId) : [...f.serviceIds, service.providerId] };
    });
    setSelectedMeta(prev => ({ ...prev, [service.providerId]: service }));
  };

  const removeSelected = (providerId: number) => setForm(f => ({ ...f, serviceIds: f.serviceIds.filter(x => x !== providerId) }));
  const clearSelected = () => setForm(f => ({ ...f, serviceIds: [] }));

  const selectVisiblePage = () => {
    setSelectedMeta(prev => { const next = { ...prev }; pickerResults.forEach(s => { next[s.providerId] = s; }); return next; });
    setForm(f => ({ ...f, serviceIds: Array.from(new Set([...f.serviceIds, ...pickerResults.map(s => s.providerId)])) }));
  };

  const deselectVisiblePage = () => {
    const visibleIds = new Set(pickerResults.map(s => s.providerId));
    setForm(f => ({ ...f, serviceIds: f.serviceIds.filter(id => !visibleIds.has(id)) }));
  };

  const selectAllMatching = async () => {
    if (pickerTotal > MAX_SELECT_ALL_MATCHING) {
      setMsg({ success: false, text: text(`النتائج كثيرة جداً (${pickerTotal}). ضيّق البحث أو الفئة أولاً.`, `Too many results (${pickerTotal}). Narrow your search or category first.`) });
      return;
    }
    setPickerBulkBusy(true);
    try {
      const params = new URLSearchParams({ admin: 'true', pageSize: '200' });
      if (pickerSearch.trim()) params.set('search', pickerSearch.trim());
      if (pickerCategory) params.set('category', pickerCategory);
      if (form.apiProviderConfigId) params.set('provider', form.apiProviderConfigId);
      let page = 1, totalPages = 1;
      const allIds: number[] = [];
      const metaMap: Record<number, ServiceRow> = {};
      do {
        params.set('page', String(page));
        const res = await fetch(`/api/services?${params}`, { credentials: 'include' });
        const data = await res.json();
        totalPages = data.totalPages || 1;
        (data.services || []).forEach((s: ServiceRow) => { allIds.push(s.providerId); metaMap[s.providerId] = s; });
        page += 1;
      } while (page <= totalPages);
      setSelectedMeta(prev => ({ ...prev, ...metaMap }));
      setForm(f => ({ ...f, serviceIds: Array.from(new Set([...f.serviceIds, ...allIds])) }));
    } finally {
      setPickerBulkBusy(false);
    }
  };

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageError('');
    if (!file.type.startsWith('image/')) { setImageError(text('يجب أن يكون ملف صورة', 'File must be an image')); return; }
    if (file.size > MAX_IMAGE_BYTES) { setImageError(text('الصورة كبيرة جداً (الحد الأقصى 1.5MB)', 'Image too large (max 1.5MB)')); return; }
    const reader = new FileReader();
    reader.onload = ev => { setForm(f => ({ ...f, imageUrl: (ev.target?.result as string) || '' })); };
    reader.readAsDataURL(file);
  };

  const selectedCount = form.serviceIds.length;
  const visibleSelectedOnPage = useMemo(() => pickerResults.filter(s => form.serviceIds.includes(s.providerId)).length, [pickerResults, form.serviceIds]);
  const allVisibleSelected = pickerResults.length > 0 && visibleSelectedOnPage === pickerResults.length;

  return (
    <div className="page-shell">
      <div className="page-heading">
        <div>
          <div className="eyebrow"><span className="eyebrow-dot" />{text('بناء الواجهة', 'Interface builder')}</div>
          <h1 className="page-title mt-2">{text('الأقسام والأزرار', 'Sections & Buttons')}</h1>
          <p className="page-subtitle">{text('تحكم في الأقسام التي تظهر للمستخدمين في صفحة الخدمات', 'Control the sections shown to customers on the services page')}</p>
        </div>
        <button onClick={openCreate} className="btn-primary">+ {text('إضافة قسم', 'Add Section')}</button>
      </div>

      {msg && <div className={`flex items-start justify-between gap-3 rounded-2xl px-4 py-3 text-sm ${msg.success ? 'bg-emerald-100 text-emerald-800 ring-1 ring-inset ring-emerald-200' : 'bg-rose-100 text-rose-800 ring-1 ring-inset ring-rose-200'}`}><span>{msg.text}</span><button onClick={() => setMsg(null)} className="opacity-70 hover:opacity-100"><X size={16} /></button></div>}

      {loading ? <div className="flex justify-center py-24"><div className="king-spinner" /></div> :
        sections.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon"><Boxes size={28} /></span>
            <p className="text-lg font-extrabold text-[#172033]">{text('لا توجد أقسام بعد', 'No sections yet')}</p>
            <p className="mt-2 text-sm text-[#64748b]">{text('أضف قسماً لعرض الخدمات للمستخدمين كأزرار منظمة', 'Add a section to display services to customers as organized categories')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {[...sections].sort((a, b) => a.displayOrder - b.displayOrder).map(s => (
              <div key={s.id} className="card !p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex flex-col items-center gap-0.5">
                      <button onClick={() => moveOrder(s, -1)} className="text-[#94a3b8] hover:text-[#172033]"><ChevronUp size={15} /></button>
                      <span className="mono text-[10px] text-[#94a3b8]">{s.displayOrder}</span>
                      <button onClick={() => moveOrder(s, 1)} className="text-[#94a3b8] hover:text-[#172033]"><ChevronDown size={15} /></button>
                    </div>
                    {s.imageUrl ? (
                      <img src={s.imageUrl} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover ring-1 ring-black/5" />
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl" style={{ backgroundColor: s.color + '20', border: `1px solid ${s.color}40` }}>{s.icon}</div>
                    )}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-bold text-[#172033]">{locale === 'ar' ? s.nameAr : s.name}</span>
                        <span className={s.isVisible ? 'badge-completed' : 'badge-canceled'}>{s.isVisible ? text('مرئي', 'Visible') : text('مخفي', 'Hidden')}</span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-[#64748b]">
                        {s.serviceMode === 'all' ? text('جميع الخدمات', 'All services') : `${JSON.parse(s.serviceIds || '[]').length} ${text('خدمة محددة', 'services selected')}`}
                        {s.apiProviderConfigId && ` • ${providers.find((p: any) => p.id === s.apiProviderConfigId)?.name || text('غير معروف', 'Unknown')}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button onClick={() => openEdit(s)} className="icon-button" title={text('تعديل', 'Edit')}><Pencil size={15} /></button>
                    <button onClick={() => toggleVisible(s)} className="icon-button" title={s.isVisible ? text('إخفاء', 'Hide') : text('إظهار', 'Show')}>{s.isVisible ? <EyeOff size={15} /> : <Eye size={15} />}</button>
                    <button onClick={() => del(s.id)} className="icon-button hover:!border-rose-400/40 hover:!bg-rose-50 hover:!text-rose-600" title={text('حذف', 'Delete')}><Trash2 size={15} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      }

      {showForm && (
        <div className="fixed inset-0 z-[60] flex items-end bg-[#0b1120]/60 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-5">
          <section className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[1.7rem] border border-black/5 bg-white shadow-2xl sm:max-w-3xl sm:rounded-[1.5rem]" role="dialog" aria-modal="true">
            <div className="flex items-start justify-between border-b border-black/5 p-5 sm:p-6">
              <div>
                <div className="eyebrow"><span className="eyebrow-dot" />{editing ? text('تعديل قسم', 'Edit section') : text('قسم جديد', 'New section')}</div>
                <h3 className="mt-2 text-lg font-extrabold text-[#172033]">{editing ? text('تعديل القسم', 'Edit Section') : text('إضافة قسم جديد', 'Add New Section')}</h3>
              </div>
              <button onClick={() => setShowForm(false)} className="icon-button"><X size={18} /></button>
            </div>

            <div className="overflow-y-auto p-5 sm:p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div><label className="input-label">{text('الاسم بالإنجليزي', 'Name (English)')} *</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input-field" placeholder="Instagram Services" /></div>
                <div><label className="input-label">{text('الاسم بالعربي', 'Name (Arabic)')} *</label><input value={form.nameAr} onChange={e => setForm({ ...form, nameAr: e.target.value })} className="input-field" placeholder="خدمات انستقرام" dir="rtl" /></div>
                <div><label className="input-label">{text('الوصف', 'Description')}</label><input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="input-field" /></div>
                <div><label className="input-label">{text('الوصف بالعربي', 'Description (Arabic)')}</label><input value={form.descriptionAr} onChange={e => setForm({ ...form, descriptionAr: e.target.value })} className="input-field" dir="rtl" /></div>
              </div>

              <div className="mt-5">
                <label className="input-label">{text('صورة القسم', 'Section image')}</label>
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl ring-1 ring-black/5" style={{ backgroundColor: form.color + '18' }}>
                    {form.imageUrl ? <img src={form.imageUrl} alt="" className="h-full w-full object-cover" /> : <span className="text-2xl">{form.icon}</span>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageFile} className="hidden" />
                    <button type="button" onClick={() => imageInputRef.current?.click()} className="btn-secondary text-xs"><ImagePlus size={15} />{text('رفع صورة', 'Upload image')}</button>
                    {form.imageUrl && <button type="button" onClick={() => setForm({ ...form, imageUrl: '' })} className="btn-ghost text-xs"><X size={14} />{text('إزالة الصورة', 'Remove image')}</button>}
                  </div>
                </div>
                {imageError && <p className="mt-2 text-xs font-bold text-rose-600">{imageError}</p>}
                <p className="mt-2 text-[11px] text-[#94a3b8]">{text('اختياري — إن لم ترفع صورة سيظهر الأيقونة واللون بدلاً منها. الحد الأقصى 1.5MB.', 'Optional — the icon and color are used if no image is set. Max 1.5MB.')}</p>
              </div>

              <div className="mt-5"><label className="input-label">{text('الأيقونة', 'Icon')}</label>
                <div className="flex flex-wrap gap-2">{ICONS.map(ic => <button key={ic} type="button" onClick={() => setForm({ ...form, icon: ic })} className={`flex h-10 w-10 items-center justify-center rounded-lg text-xl transition-all ${form.icon === ic ? 'bg-amber-100 ring-2 ring-amber-400' : 'border border-black/10 bg-white hover:border-amber-300'}`}>{ic}</button>)}</div>
              </div>
              <div className="mt-5"><label className="input-label">{text('اللون', 'Color')}</label>
                <div className="flex flex-wrap gap-2">{COLORS.map(c => <button key={c} type="button" onClick={() => setForm({ ...form, color: c })} className={`h-8 w-8 rounded-lg transition-all ${form.color === c ? 'ring-2 ring-offset-2 ring-[#172033]' : ''}`} style={{ backgroundColor: c }} />)}</div>
              </div>

              <div className="mt-5"><label className="input-label">{text('المزوّد (اختياري)', 'Provider (optional)')}</label>
                <select value={form.apiProviderConfigId} onChange={e => { setForm({ ...form, apiProviderConfigId: e.target.value }); setPickerPage(1); }} className="select-field">
                  <option value="">{text('كل المزوّدين (بحث في كامل الكتالوج المحلي)', 'All providers (search the full local catalog)')}</option>
                  {providers.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <p className="mt-1.5 text-[11px] text-[#94a3b8]">{text('يمكنك ترك هذا فارغاً والبحث عن أي خدمة متزامنة محلياً من أي مزوّد.', 'Leave this empty to search every locally synced service across all providers.')}</p>
              </div>

              <div className="mt-5"><label className="input-label">{text('طريقة عرض الخدمات', 'Service display mode')}</label>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setForm({ ...form, serviceMode: 'all' })} className={`flex-1 rounded-xl border py-2.5 text-sm font-bold transition-colors ${form.serviceMode === 'all' ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-black/10 bg-white text-[#64748b]'}`}>📦 {text('جميع الخدمات', 'All Services')}</button>
                  <button type="button" onClick={() => setForm({ ...form, serviceMode: 'selected' })} className={`flex-1 rounded-xl border py-2.5 text-sm font-bold transition-colors ${form.serviceMode === 'selected' ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-black/10 bg-white text-[#64748b]'}`}>✅ {text('خدمات محددة', 'Selected Services')}</button>
                </div>
              </div>

              {form.serviceMode === 'selected' && (
                <div className="mt-5 space-y-3">
                  <label className="input-label !mb-0">{text('اختر الخدمات', 'Select services')}</label>

                  <div className="rounded-2xl border border-black/10 bg-[#f8fafc] p-3">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center">
                      <div className="relative flex-1"><Search className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8]" size={16} /><input value={pickerSearch} onChange={e => setPickerSearch(e.target.value)} placeholder={text('ابحث باسم الخدمة أو الفئة...', 'Search by service name or category...')} className="input-field !ps-10 !py-2.5 text-sm" /></div>
                      <div className="relative md:w-56"><Tags className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" size={15} /><select value={pickerCategory} onChange={e => setPickerCategory(e.target.value)} className="select-field !ps-8 !py-2.5 text-xs"><option value="">{text('كل الفئات', 'All categories')}</option>{pickerCategories.map(c => <option key={c} value={c}>{c}</option>)}</select><ChevronDown className="pointer-events-none absolute end-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8]" size={14} /></div>
                    </div>

                    <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#64748b]">
                      <span className="flex items-center gap-1.5"><SlidersHorizontal size={13} className="text-[#94a3b8]" />{pickerLoading ? text('جارٍ البحث...', 'Searching...') : text(`${pickerTotal} نتيجة مطابقة`, `${pickerTotal} matching results`)}</span>
                      <div className="flex flex-wrap gap-1.5">
                        <button type="button" onClick={allVisibleSelected ? deselectVisiblePage : selectVisiblePage} disabled={!pickerResults.length} className="btn-secondary !rounded-lg !px-2.5 !py-1.5 text-[11px] disabled:opacity-40"><Check size={13} />{allVisibleSelected ? text('إلغاء تحديد الصفحة', 'Deselect page') : text('تحديد هذه الصفحة', 'Select this page')}</button>
                        <button type="button" onClick={selectAllMatching} disabled={pickerBulkBusy || !pickerTotal} className="btn-secondary !rounded-lg !px-2.5 !py-1.5 text-[11px] disabled:opacity-40">{pickerBulkBusy ? <Loader2 size={13} className="animate-spin" /> : <ListChecks size={13} />}{text('تحديد الكل', 'Select all matching')}</button>
                        {selectedCount > 0 && <button type="button" onClick={clearSelected} className="btn-ghost !rounded-lg !px-2.5 !py-1.5 text-[11px]"><X size={13} />{text('مسح التحديد', 'Clear selection')}</button>}
                      </div>
                    </div>

                    <div className="mt-3 max-h-64 space-y-1 overflow-y-auto rounded-xl border border-black/5 bg-white p-2">
                      {pickerLoading ? (
                        <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-[#94a3b8]" /></div>
                      ) : pickerResults.length === 0 ? (
                        <p className="px-2 py-8 text-center text-xs text-[#94a3b8]">{pickerSearch || pickerCategory ? text('لا توجد نتائج مطابقة لبحثك.', 'No results match your search.') : text('لا توجد خدمات متزامنة بعد. زامن مزوّداً من صفحة المزوّدين أولاً.', 'No synced services yet. Sync a provider from the Providers page first.')}</p>
                      ) : pickerResults.map(s => {
                        const checked = form.serviceIds.includes(s.providerId);
                        return (
                          <label key={s.id} className={`flex cursor-pointer items-center gap-3 rounded-lg p-2 transition-colors ${checked ? 'bg-amber-50' : 'hover:bg-[#f1f5f9]'}`}>
                            <input type="checkbox" checked={checked} onChange={() => toggleServiceId(s)} className="h-4 w-4 accent-amber-500" />
                            <span className="mono w-14 shrink-0 text-[11px] text-[#94a3b8]">#{s.providerId}</span>
                            <span className="min-w-0 flex-1 truncate text-sm text-[#172033]">{locale === 'ar' && s.nameAr ? s.nameAr : s.name}</span>
                            <span className="shrink-0 rounded-full bg-[#f1f5f9] px-2 py-0.5 text-[10px] font-bold text-[#64748b]">{s.category}</span>
                            <span className="mono shrink-0 text-xs text-[#b7791f]">${Number(s.displayPricePerK ?? s.finalPricePerK ?? 0).toFixed(4)}</span>
                          </label>
                        );
                      })}
                    </div>

                    {pickerTotalPages > 1 && (
                      <div className="mt-2 flex items-center justify-center gap-2">
                        <button type="button" onClick={() => setPickerPage(p => Math.max(1, p - 1))} disabled={pickerPage <= 1} className="btn-ghost !rounded-lg !px-2.5 !py-1.5 text-[11px] disabled:opacity-30">{text('السابق', 'Prev')}</button>
                        <span className="mono text-[11px] text-[#94a3b8]">{text(`صفحة ${pickerPage} من ${pickerTotalPages}`, `Page ${pickerPage} of ${pickerTotalPages}`)}</span>
                        <button type="button" onClick={() => setPickerPage(p => Math.min(pickerTotalPages, p + 1))} disabled={pickerPage >= pickerTotalPages} className="btn-ghost !rounded-lg !px-2.5 !py-1.5 text-[11px] disabled:opacity-30">{text('التالي', 'Next')}</button>
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-3">
                    <button type="button" onClick={() => setShowSelectedPanel(v => !v)} className="flex w-full items-center justify-between text-start">
                      <span className="text-xs font-extrabold text-amber-800">{text(`${selectedCount} خدمة محددة`, `${selectedCount} services selected`)}</span>
                      {selectedCount > 0 && (showSelectedPanel ? <ChevronUp size={15} className="text-amber-700" /> : <ChevronDown size={15} className="text-amber-700" />)}
                    </button>
                    {showSelectedPanel && selectedCount > 0 && (
                      <div className="mt-2 flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
                        {form.serviceIds.map(id => {
                          const meta = selectedMeta[id];
                          return (
                            <span key={id} className="count-chip !bg-white">
                              {meta ? (locale === 'ar' && meta.nameAr ? meta.nameAr : meta.name) : `#${id}`}
                              {meta?.id && <button type="button" onClick={() => { window.location.href = `/admin/services?edit=${meta.id}`; }} className="ms-1 text-[#64748b] hover:text-amber-600" title={text('تعديل الخدمة', 'Edit service')}><Pencil size={12} /></button>}
                              <button type="button" onClick={() => removeSelected(id)} className="ms-1 text-[#94a3b8] hover:text-rose-600"><X size={12} /></button>
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="mt-5 flex items-center gap-2">
                <input type="checkbox" id="section-visible" checked={form.isVisible} onChange={e => setForm({ ...form, isVisible: e.target.checked })} className="h-4 w-4 accent-amber-500" />
                <label htmlFor="section-visible" className="text-sm font-bold text-[#334155]">{text('مرئي للمستخدمين', 'Visible to customers')}</label>
              </div>
            </div>

            <div className="flex gap-3 border-t border-black/5 p-5 sm:p-6">
              <button onClick={() => setShowForm(false)} className="btn-secondary flex-1">{text('إلغاء', 'Cancel')}</button>
              <button onClick={save} disabled={saving} className="btn-primary flex-1">{saving ? <Loader2 size={16} className="animate-spin" /> : <Layers3 size={16} />}{text('حفظ', 'Save')}</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
