import { useEffect, useMemo, useState } from 'react';
import {
  Check, ChevronDown, Eye, EyeOff, Filter, Layers3, Loader2, Pencil,
  RefreshCw, Search, SlidersHorizontal, Tags, Trash2, X, Zap,
} from 'lucide-react';
import { useLang } from '../../lib/context';

type BulkAction = 'activate' | 'deactivate' | 'hide' | 'show' | 'delete' | 'markup';

export default function AdminServicesPage() {
  const { t, locale } = useLang();
  const [services, setServices] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [provider, setProvider] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<any>(null);
  const [editVals, setEditVals] = useState({ nameAr: '', catAr: '', markup: '' });
  const [bulkMarkupOpen, setBulkMarkupOpen] = useState(false);
  const [bulkMarkup, setBulkMarkup] = useState('');
  const [msg, setMsg] = useState<{ text: string; success: boolean } | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams({ admin: 'true', page: String(page), pageSize: '60' });
    if (search.trim()) params.set('search', search.trim());
    if (provider) params.set('provider', provider);
    if (category) params.set('category', category);
    if (status) params.set('status', status);
    fetch(`/api/services?${params}`, { credentials: 'include' }).then(response => response.json()).then(data => {
      setServices(data.services || []);
      setCategories(data.categories || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    const timer = window.setTimeout(load, search ? 220 : 0);
    return () => window.clearTimeout(timer);
  }, [page, search, provider, category, status]);

  useEffect(() => { setPage(1); }, [search, provider, category, status]);

  useEffect(() => {
    fetch('/api/providers', { credentials: 'include' }).then(response => response.json()).then(data => setProviders(data.providers || []));
  }, []);

  const providerNames = useMemo(() => new Map(providers.map(item => [item.id, item.name])), [providers]);
  const displayedIds = useMemo(() => services.map(service => service.id), [services]);
  const allSelected = displayedIds.length > 0 && displayedIds.every(id => selected.has(id));
  const selectedCount = selected.size;

  const toggleSelection = (id: string) => setSelected(current => {
    const next = new Set(current);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const toggleAll = () => setSelected(current => {
    if (allSelected) {
      const next = new Set(current);
      displayedIds.forEach(id => next.delete(id));
      return next;
    }
    return new Set([...current, ...displayedIds]);
  });

  const sync = async () => {
    setSyncing(true);
    setMsg(null);
    const response = await fetch('/api/services/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(provider ? { apiProviderConfigId: provider } : {}) });
    const data = await response.json();
    if (response.ok) setMsg({ success: true, text: locale === 'ar' ? `اكتملت المزامنة: ${data.created} خدمات جديدة و${data.updated} محدثة.` : `Sync complete: ${data.created} created and ${data.updated} updated.` });
    else setMsg({ success: false, text: data.error || t.error });
    setSyncing(false);
    load();
  };

  const update = async (id: string, data: Record<string, unknown>) => {
    const response = await fetch(`/api/services/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(data) });
    const result = await response.json();
    if (!response.ok) setMsg({ success: false, text: result.error || t.error });
    else setMsg({ success: true, text: locale === 'ar' ? 'تم تحديث الخدمة.' : 'Service updated.' });
    setEditing(null);
    load();
  };

  const executeBulk = async (action: BulkAction, markup?: number) => {
    if (!selectedCount) return;
    if (action === 'delete' && !window.confirm(locale === 'ar' ? `حذف ${selectedCount} خدمة نهائياً؟` : `Permanently delete ${selectedCount} services?`)) return;
    const response = await fetch('/api/services/bulk', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ ids: Array.from(selected), action, markupPercent: markup }) });
    const result = await response.json();
    if (!response.ok) setMsg({ success: false, text: result.error || t.error });
    else setMsg({ success: true, text: locale === 'ar' ? `تم تطبيق الإجراء على ${result.affected} خدمة.` : `Action applied to ${result.affected} services.` });
    setBulkMarkupOpen(false);
    setSelected(new Set());
    load();
  };

  const clearFilters = () => { setSearch(''); setProvider(''); setCategory(''); setStatus(''); };
  const hasFilters = Boolean(search || provider || category || status);

  return <div className="page-shell">
    <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-dot" />{locale === 'ar' ? 'كتالوج المنصة' : 'Platform catalog'}</div><h1 className="page-title mt-2">{t.services}</h1><p className="page-subtitle">{locale === 'ar' ? 'ابحث، صفِّ، وطبّق التحديثات على خدماتك من مساحة إدارة واحدة.' : 'Search, filter, and apply updates to your services from one management space.'}</p></div><button onClick={sync} disabled={syncing} className="btn-primary">{syncing ? <Loader2 size={17} className="animate-spin" /> : <RefreshCw size={17} />}{syncing ? t.loading : t.syncServices}</button></div>

    {msg && <div className={`flex items-start justify-between gap-3 rounded-2xl px-4 py-3 text-sm ${msg.success ? 'bg-emerald-400/10 text-emerald-200 ring-1 ring-emerald-300/20' : 'bg-rose-400/10 text-rose-200 ring-1 ring-rose-300/20'}`}><span>{msg.text}</span><button onClick={() => setMsg(null)} className="opacity-75 transition-opacity hover:opacity-100"><X size={16} /></button></div>}

    <section className="card !p-3 sm:!p-4"><div className="grid gap-3 xl:grid-cols-[minmax(0,1.5fr)_repeat(3,minmax(0,.7fr))_auto]"><div className="relative"><Search className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-[#7883a3]" size={18} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder={locale === 'ar' ? 'ابحث باسم الخدمة أو الفئة...' : 'Search service or category...'} className="input-field !ps-11" /></div><div className="relative"><Layers3 className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-[#8793b3]" size={16} /><select value={provider} onChange={event => setProvider(event.target.value)} className="select-field !ps-9 !py-3 text-xs"><option value="">{locale === 'ar' ? 'كل المزوّدين' : 'All providers'}</option>{providers.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><ChevronDown className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-[#8793b3]" size={15} /></div><div className="relative"><Tags className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-[#8793b3]" size={16} /><select value={category} onChange={event => setCategory(event.target.value)} className="select-field !ps-9 !py-3 text-xs"><option value="">{locale === 'ar' ? 'كل الفئات' : 'All categories'}</option>{categories.map(item => <option key={item} value={item}>{item}</option>)}</select><ChevronDown className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-[#8793b3]" size={15} /></div><div className="relative"><Filter className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-[#8793b3]" size={16} /><select value={status} onChange={event => setStatus(event.target.value)} className="select-field !ps-9 !py-3 text-xs"><option value="">{locale === 'ar' ? 'كل الحالات' : 'All statuses'}</option><option value="active">{t.active}</option><option value="inactive">{t.inactive}</option><option value="hidden">{t.hidden}</option></select><ChevronDown className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-[#8793b3]" size={15} /></div>{hasFilters && <button onClick={clearFilters} className="btn-ghost !rounded-xl !px-3 text-xs"><X size={15} />{locale === 'ar' ? 'مسح' : 'Clear'}</button>}</div></section>

    <section className="flex flex-col gap-3 rounded-2xl border border-white/[.075] bg-white/[.025] p-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#7868ff]/12 text-[#b7adff]"><SlidersHorizontal size={17} /></span><div><p className="text-sm font-extrabold text-white">{locale === 'ar' ? `${services.length} من ${total} خدمة` : `${services.length} of ${total} services`}</p><p className="text-[11px] text-[#8590ae]">{selectedCount ? (locale === 'ar' ? `${selectedCount} محددة للإجراء` : `${selectedCount} selected for action`) : (locale === 'ar' ? 'حدّد الخدمات لإجراء جماعي أسرع.' : 'Select services for faster bulk actions.')}</p></div></div><div className="flex flex-wrap items-center gap-2"><button onClick={toggleAll} className="btn-secondary !rounded-lg !px-3 !py-2 text-xs"><Check size={15} />{allSelected ? (locale === 'ar' ? 'إلغاء التحديد' : 'Deselect all') : (locale === 'ar' ? 'تحديد الكل' : 'Select all')}</button>{selectedCount > 0 && <button onClick={() => setSelected(new Set())} className="btn-ghost !rounded-lg !px-3 !py-2 text-xs"><X size={15} />{locale === 'ar' ? 'إلغاء' : 'Clear selection'}</button>}</div></section>

    {selectedCount > 0 && <section className="sticky top-[5.1rem] z-20 flex flex-col gap-3 rounded-2xl border border-[#ffc95c]/25 bg-[#211d2d]/94 p-3 shadow-[0_18px_38px_rgba(0,0,0,.28)] backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><span className="mono flex h-9 min-w-9 items-center justify-center rounded-xl bg-[#ffc95c] px-2 text-sm font-bold text-[#231d2d]">{selectedCount}</span><p className="text-sm font-bold text-white">{locale === 'ar' ? 'خدمات محددة' : 'services selected'}</p></div><div className="flex flex-wrap gap-2"><button onClick={() => executeBulk('activate')} className="btn-success !rounded-lg !px-3 !py-2 text-xs"><Check size={15} />{t.active}</button><button onClick={() => executeBulk('deactivate')} className="btn-secondary !rounded-lg !px-3 !py-2 text-xs"><EyeOff size={15} />{t.inactive}</button><button onClick={() => executeBulk('hide')} className="btn-secondary !rounded-lg !px-3 !py-2 text-xs"><EyeOff size={15} />{t.hidden}</button><button onClick={() => setBulkMarkupOpen(true)} className="btn-secondary !rounded-lg !px-3 !py-2 text-xs"><Zap size={15} />{t.markupPercent}</button><button onClick={() => executeBulk('delete')} className="btn-danger !rounded-lg !px-3 !py-2 text-xs"><Trash2 size={15} />{t.delete}</button></div></section>}

    {loading ? <div className="flex justify-center py-24"><div className="king-spinner" /></div> : services.length === 0 ? <div className="empty-state"><span className="empty-icon"><Search size={28} /></span><p className="text-lg font-extrabold text-white">{locale === 'ar' ? 'لا توجد خدمات مطابقة' : 'No matching services'}</p><p className="mt-2 text-sm text-[#8d98b7]">{locale === 'ar' ? 'غيّر الفلاتر أو أعد مزامنة مزوّد الخدمات.' : 'Adjust filters or sync your service provider again.'}</p></div> : <section className="table-wrap"><table className="w-full min-w-[1100px]"><thead className="bg-white/[.025]"><tr><th className="table-header w-12"><input type="checkbox" checked={allSelected} onChange={toggleAll} className="h-4 w-4 accent-[#ffc95c]" aria-label="Select all services" /></th><th className="table-header">ID</th><th className="table-header">{t.services}</th><th className="table-header">{locale === 'ar' ? 'المزوّد' : 'Provider'}</th><th className="table-header">{t.category}</th><th className="table-header">{t.price}</th><th className="table-header">{t.markupPercent}</th><th className="table-header">{t.status}</th><th className="table-header text-end">{t.actions}</th></tr></thead><tbody>{services.map(service => <tr key={service.id} className={`table-row ${selected.has(service.id) ? 'table-row-selected' : ''}`}><td className="table-cell"><input type="checkbox" checked={selected.has(service.id)} onChange={() => toggleSelection(service.id)} className="h-4 w-4 accent-[#ffc95c]" aria-label={`Select ${service.name}`} /></td><td className="table-cell"><span className="mono text-[11px] text-[#8390af]">#{service.providerId}</span></td><td className="table-cell max-w-[270px]"><p className="truncate font-bold text-white">{service.name}</p>{service.nameAr && <p className="mt-1 truncate text-xs text-[#8c98b7]">{service.nameAr}</p>}</td><td className="table-cell"><span className="rounded-lg bg-[#7868ff]/10 px-2 py-1 text-xs font-bold text-[#bdb5ff]">{providerNames.get(service.apiProviderConfigId) || (locale === 'ar' ? 'غير محدد' : 'Unassigned')}</span></td><td className="table-cell max-w-[145px] truncate text-xs">{service.category}</td><td className="table-cell"><span className="mono text-xs text-[#ffda83]">${service.displayPricePerK?.toFixed(4) || service.finalPricePerK?.toFixed(4)}</span></td><td className="table-cell"><span className="mono text-xs text-[#c0c8df]">{service.markupPercent}%</span></td><td className="table-cell"><div className="flex flex-wrap gap-1.5">{service.isActive ? <span className="badge-completed"><span className="h-1.5 w-1.5 rounded-full bg-current opacity-75" />{t.active}</span> : <span className="badge-failed"><span className="h-1.5 w-1.5 rounded-full bg-current opacity-75" />{t.inactive}</span>}{service.isHidden && <span className="badge-canceled"><EyeOff size={11} />{t.hidden}</span>}</div></td><td className="table-cell text-end"><div className="flex justify-end gap-2"><button onClick={() => { setEditing(service); setEditVals({ nameAr: service.nameAr || '', catAr: service.categoryAr || '', markup: String(service.markupPercent ?? '') }); }} className="icon-button" title={t.edit}><Pencil size={15} /></button><button onClick={() => update(service.id, { isActive: !service.isActive })} className="icon-button" title={service.isActive ? t.inactive : t.active}>{service.isActive ? <EyeOff size={15} /> : <Eye size={15} />}</button><button onClick={async () => { if (!window.confirm(locale === 'ar' ? 'حذف هذه الخدمة؟' : 'Delete this service?')) return; const response = await fetch(`/api/services/${service.id}`, { method: 'DELETE', credentials: 'include' }); if (response.ok) { setMsg({ success: true, text: locale === 'ar' ? 'تم حذف الخدمة.' : 'Service deleted.' }); load(); } }} className="icon-button hover:!border-rose-400/35 hover:!bg-rose-400/10 hover:!text-rose-200" title={t.delete}><Trash2 size={15} /></button></div></td></tr>)}</tbody></table></section>}

    {!loading && services.length > 0 && totalPages > 1 && <section className="flex items-center justify-center gap-2 py-2">
      <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="btn-secondary !rounded-lg !px-3 !py-2 text-xs disabled:opacity-40">{locale === 'ar' ? 'السابق' : 'Prev'}</button>
      <span className="mono text-xs text-[#8d98b7]">{locale === 'ar' ? `صفحة ${page} من ${totalPages}` : `Page ${page} of ${totalPages}`}</span>
      <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="btn-secondary !rounded-lg !px-3 !py-2 text-xs disabled:opacity-40">{locale === 'ar' ? 'التالي' : 'Next'}</button>
    </section>}

    {editing && <div className="fixed inset-0 z-[60] flex items-end bg-[#03040b]/78 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-5"><section className="w-full rounded-t-[1.7rem] border border-white/[.1] bg-[#12182a] shadow-2xl sm:max-w-lg sm:rounded-[1.5rem]" role="dialog" aria-modal="true"><div className="flex items-start justify-between border-b border-white/[.07] p-5"><div><div className="eyebrow"><span className="eyebrow-dot" />{locale === 'ar' ? 'تحرير الخدمة' : 'Edit service'}</div><h3 className="mt-2 max-w-[22rem] truncate text-lg font-extrabold text-white">{editing.name}</h3></div><button onClick={() => setEditing(null)} className="icon-button"><X size={18} /></button></div><div className="space-y-4 p-5"><div><label className="input-label">{locale === 'ar' ? 'اسم الخدمة بالعربية' : 'Arabic service name'}</label><input value={editVals.nameAr} onChange={event => setEditVals({ ...editVals, nameAr: event.target.value })} className="input-field" dir="rtl" /></div><div><label className="input-label">{locale === 'ar' ? 'التصنيف بالعربية' : 'Arabic category'}</label><input value={editVals.catAr} onChange={event => setEditVals({ ...editVals, catAr: event.target.value })} className="input-field" dir="rtl" /></div><div><label className="input-label">{t.markupPercent}</label><input type="number" value={editVals.markup} onChange={event => setEditVals({ ...editVals, markup: event.target.value })} className="input-field mono" /></div></div><div className="flex gap-3 border-t border-white/[.07] p-5"><button onClick={() => setEditing(null)} className="btn-secondary flex-1">{t.cancel}</button><button onClick={() => update(editing.id, { nameAr: editVals.nameAr, categoryAr: editVals.catAr, markupPercent: Number(editVals.markup) })} className="btn-primary flex-1">{t.save}</button></div></section></div>}
    {bulkMarkupOpen && <div className="fixed inset-0 z-[65] flex items-end bg-[#03040b]/78 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-5"><section className="w-full rounded-t-[1.7rem] border border-white/[.1] bg-[#12182a] p-5 shadow-2xl sm:max-w-md sm:rounded-[1.5rem]"><div className="flex items-start justify-between"><div><div className="eyebrow"><span className="eyebrow-dot" />{locale === 'ar' ? 'تحديث جماعي' : 'Bulk update'}</div><h3 className="mt-2 text-lg font-extrabold text-white">{t.markupPercent}</h3></div><button onClick={() => setBulkMarkupOpen(false)} className="icon-button"><X size={18} /></button></div><p className="mt-3 text-sm text-[#9ba6c3]">{locale === 'ar' ? `سيتم تطبيق النسبة على ${selectedCount} خدمة محددة.` : `This percentage will apply to ${selectedCount} selected services.`}</p><div className="mt-5"><label className="input-label">{t.markupPercent}</label><input type="number" value={bulkMarkup} onChange={event => setBulkMarkup(event.target.value)} placeholder="20" className="input-field mono" autoFocus /></div><div className="mt-5 flex gap-3"><button onClick={() => setBulkMarkupOpen(false)} className="btn-secondary flex-1">{t.cancel}</button><button onClick={() => executeBulk('markup', Number(bulkMarkup))} disabled={!bulkMarkup.trim()} className="btn-primary flex-1">{locale === 'ar' ? 'تطبيق النسبة' : 'Apply markup'}</button></div></section></div>}
  </div>;
}
