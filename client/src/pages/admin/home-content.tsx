import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Eye, EyeOff, ImagePlus, Pencil, Plus, Search, Star, Trash2, X } from 'lucide-react';
import { useLang } from '../../lib/context';

type BannerForm = {
  title: string;
  titleAr: string;
  subtitle: string;
  subtitleAr: string;
  imageUrl: string;
  actionUrl: string;
  actionLabel: string;
  actionLabelAr: string;
  accentColor: string;
  displayOrder: number;
  isActive: boolean;
};

const blankBanner = (displayOrder = 0): BannerForm => ({
  title: '', titleAr: '', subtitle: '', subtitleAr: '', imageUrl: '', actionUrl: '', actionLabel: '', actionLabelAr: '', accentColor: '#64748b', displayOrder, isActive: true,
});

export default function AdminHomeContentPage() {
  const { locale } = useLang();
  const [banners, setBanners] = useState<any[]>([]);
  const [featuredServices, setFeaturedServices] = useState<any[]>([]);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [maxFeatured, setMaxFeatured] = useState(12);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [editingBanner, setEditingBanner] = useState<any | null>(null);
  const [showBannerModal, setShowBannerModal] = useState(false);
  const [bannerForm, setBannerForm] = useState<BannerForm>(blankBanner());

  const text = (ar: string, en: string) => locale === 'ar' ? ar : en;
  const featuredIds = useMemo(() => new Set(featuredServices.map(service => service.id)), [featuredServices]);

  const loadHome = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await fetch('/api/admin/home-content', { credentials: 'include' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to load content');
      setBanners(data.banners || []);
      setFeaturedServices(data.featuredServices || []);
      setMaxFeatured(data.maxFeaturedServices || 12);
    } catch (error) {
      setMessage(`❌ ${error instanceof Error ? error.message : text('تعذر تحميل المحتوى', 'Unable to load content')}`);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const loadCatalog = async (query = '') => {
    try {
      const response = await fetch(`/api/admin/home-services?search=${encodeURIComponent(query)}`, { credentials: 'include' });
      const data = await response.json();
      if (response.ok) setCatalog(data.services || []);
    } catch {
      setCatalog([]);
    }
  };

  useEffect(() => { loadHome(); loadCatalog(); }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => loadCatalog(search), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  const openCreate = () => {
    setEditingBanner(null);
    setBannerForm(blankBanner(banners.length));
    setShowBannerModal(true);
    setMessage('');
  };

  const openEdit = (banner: any) => {
    setEditingBanner(banner);
    setShowBannerModal(true);
    setBannerForm({
      title: banner.title || '', titleAr: banner.titleAr || '', subtitle: banner.subtitle || '', subtitleAr: banner.subtitleAr || '', imageUrl: banner.imageUrl || '', actionUrl: banner.actionUrl || '', actionLabel: banner.actionLabel || '', actionLabelAr: banner.actionLabelAr || '', accentColor: banner.accentColor || '#64748b', displayOrder: banner.displayOrder || 0, isActive: banner.isActive,
    });
    setMessage('');
  };

  const closeModal = () => {
    setEditingBanner(null);
    setShowBannerModal(false);
    setBannerForm(blankBanner());
  };

  const saveBanner = async () => {
    if (!bannerForm.title.trim()) {
      setMessage(`❌ ${text('أدخل عنوان البنر بالإنجليزية على الأقل.', 'Enter a banner title.')}`);
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(editingBanner ? `/api/admin/banners/${editingBanner.id}` : '/api/admin/banners', {
        method: editingBanner ? 'PATCH' : 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bannerForm),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to save banner');
      setMessage(`✅ ${text('تم حفظ البنر بنجاح.', 'Banner saved successfully.')}`);
      closeModal();
      await loadHome(true);
    } catch (error) {
      setMessage(`❌ ${error instanceof Error ? error.message : text('تعذر حفظ البنر.', 'Unable to save banner.')}`);
    } finally {
      setSaving(false);
    }
  };

  const deleteBanner = async (banner: any) => {
    if (!confirm(text(`حذف البنر «${banner.titleAr || banner.title}»؟`, `Delete “${banner.title}”?`))) return;
    try {
      const response = await fetch(`/api/admin/banners/${banner.id}`, { method: 'DELETE', credentials: 'include' });
      if (!response.ok) throw new Error('Unable to delete banner');
      setMessage(`✅ ${text('تم حذف البنر.', 'Banner deleted.')}`);
      await loadHome(true);
    } catch {
      setMessage(`❌ ${text('تعذر حذف البنر.', 'Unable to delete banner.')}`);
    }
  };

  const updateBannerVisibility = async (banner: any) => {
    try {
      const response = await fetch(`/api/admin/banners/${banner.id}`, {
        method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: !banner.isActive }),
      });
      if (!response.ok) throw new Error('Unable to update banner');
      await loadHome(true);
    } catch {
      setMessage(`❌ ${text('تعذر تحديث حالة البنر.', 'Unable to update banner status.')}`);
    }
  };

  const toggleFeatured = async (service: any) => {
    const willFeature = !featuredIds.has(service.id);
    if (willFeature && featuredServices.length >= maxFeatured) {
      setMessage(`❌ ${text(`يمكن اختيار ${maxFeatured} خدمة مميزة كحد أقصى.`, `You can feature up to ${maxFeatured} services.`)}`);
      return;
    }
    try {
      const response = await fetch(`/api/admin/services/${service.id}/featured`, {
        method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isFeatured: willFeature, featuredOrder: featuredServices.length }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to update service');
      await Promise.all([loadHome(true), loadCatalog(search)]);
      setMessage(`✅ ${willFeature ? text('تمت إضافة الخدمة إلى البطاقات المميزة.', 'Service added to featured cards.') : text('تمت إزالة الخدمة من البطاقات المميزة.', 'Service removed from featured cards.')}`);
    } catch (error) {
      setMessage(`❌ ${error instanceof Error ? error.message : text('تعذر تحديث الخدمة.', 'Unable to update service.')}`);
    }
  };

  return (
    <div className="page-shell">
      <section className="page-heading">
        <div>
          <div className="eyebrow"><span className="eyebrow-dot" />{text('محتوى الواجهة', 'Front-page content')}</div>
          <h1 className="page-title mt-2">{text('البنرات والخدمات المميزة', 'Banners & featured services')}</h1>
          <p className="page-subtitle">{text('أنشئ عروضاً احترافية واختر الخدمات التي تبرز في الصفحة الرئيسية للمستخدم.', 'Create polished promotions and choose the services showcased on the user homepage.')}</p>
        </div>
        <button onClick={openCreate} className="btn-primary"><Plus size={17} />{text('إضافة بنر', 'Add banner')}</button>
      </section>

      {message && <div className="notice-bar">{message}</div>}

      <section className="content-manager-grid">
        <article className="card">
          <div className="mb-5 flex items-start justify-between gap-4"><div><h2 className="text-lg font-extrabold text-white">{text('البنرات المتحركة', 'Rotating banners')}</h2><p className="mt-1 text-xs text-[#8d98b7]">{text('تظهر بالتتابع في أعلى الصفحة الرئيسية.', 'Displayed in sequence at the top of the homepage.')}</p></div><span className="count-chip">{banners.length}</span></div>
          {loading ? <div className="grid gap-3"><div className="skeleton h-36 rounded-2xl" /><div className="skeleton h-36 rounded-2xl" /></div> : banners.length === 0 ? <div className="manager-empty"><ImagePlus size={26} /><p>{text('لا توجد بنرات بعد.', 'No banners yet.')}</p><span>{text('أضف أول بنر لعرض عروضك ورسائلك المهمة.', 'Add your first banner to spotlight offers and announcements.')}</span></div> : <div className="space-y-3">{banners.map(banner => <article key={banner.id} className={`admin-banner-card ${!banner.isActive ? 'is-muted' : ''}`} style={{ '--banner-accent': banner.accentColor } as CSSProperties}>
            <div className="admin-banner-preview">{banner.imageUrl ? <img src={banner.imageUrl} alt="" /> : <div className="admin-banner-art"><ImagePlus size={22} /></div>}</div>
            <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="truncate text-sm font-extrabold text-white">{locale === 'ar' && banner.titleAr ? banner.titleAr : banner.title}</p><span className={banner.isActive ? 'badge-completed' : 'badge-canceled'}>{banner.isActive ? text('ظاهر', 'Live') : text('مخفي', 'Hidden')}</span></div><p className="mt-1 line-clamp-2 text-xs text-[#8d98b7]">{locale === 'ar' && banner.subtitleAr ? banner.subtitleAr : banner.subtitle || text('بدون وصف', 'No subtitle')}</p><p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-[#75809e]">{text('الترتيب', 'Order')}: {banner.displayOrder}</p></div>
            <div className="flex shrink-0 items-center gap-1"><button onClick={() => updateBannerVisibility(banner)} className="icon-button !h-8 !w-8" aria-label="Toggle banner visibility">{banner.isActive ? <EyeOff size={15} /> : <Eye size={15} />}</button><button onClick={() => openEdit(banner)} className="icon-button !h-8 !w-8" aria-label="Edit banner"><Pencil size={14} /></button><button onClick={() => deleteBanner(banner)} className="icon-button !h-8 !w-8 hover:!border-rose-300 hover:!text-rose-600" aria-label="Delete banner"><Trash2 size={14} /></button></div>
          </article>)}</div>}
        </article>

        <article className="card">
          <div className="mb-5 flex items-start justify-between gap-4"><div><h2 className="text-lg font-extrabold text-white">{text('اختيار البطاقات المميزة', 'Featured card selection')}</h2><p className="mt-1 text-xs text-[#8d98b7]">{text(`اختر حتى ${maxFeatured} خدمة ظاهرة ونشطة فقط.`, `Choose up to ${maxFeatured} active, visible services.`)}</p></div><span className="count-chip"><Star size={13} />{featuredServices.length}/{maxFeatured}</span></div>
          <div className="relative"><Search size={17} className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-[#7883a3]" /><input value={search} onChange={event => setSearch(event.target.value)} className="input-field !py-2.5 !ps-10" placeholder={text('ابحث باسم الخدمة أو الفئة...', 'Search service or category...')} /></div>
          <div className="mt-4 max-h-[27rem] space-y-2 overflow-y-auto pe-1">{catalog.map(service => {
            const isFeatured = featuredIds.has(service.id);
            return <button key={service.id} onClick={() => toggleFeatured(service)} className={`featured-picker ${isFeatured ? 'is-selected' : ''}`}><span className="service-thumb">{service.imageUrl ? <img src={service.imageUrl} alt="" /> : <Star size={15} />}</span><span className="min-w-0 flex-1 text-start"><span className="block truncate text-sm font-bold text-white">{locale === 'ar' && service.nameAr ? service.nameAr : service.name}</span><span className="mt-0.5 block truncate text-[11px] text-[#8d98b7]">#{service.providerId} · {service.category}</span></span><span className={isFeatured ? 'featured-toggle selected' : 'featured-toggle'}>{isFeatured ? text('مُختارة', 'Selected') : text('اختيار', 'Select')}</span></button>;
          })}</div>
        </article>
      </section>

      <section className="card">
        <div className="mb-5 flex items-center justify-between"><div><h2 className="text-lg font-extrabold text-white">{text('المختارة حالياً', 'Currently featured')}</h2><p className="mt-1 text-xs text-[#8d98b7]">{text('هذه البطاقات ستظهر للمستخدمين في الصفحة الرئيسية.', 'These cards will be visible to customers on the homepage.')}</p></div><Star size={21} className="text-[#ffc95c]" /></div>
        {featuredServices.length === 0 ? <div className="manager-empty !min-h-36"><Star size={25} /><p>{text('لم يتم اختيار خدمات مميزة بعد.', 'No featured services selected yet.')}</p></div> : <div className="featured-admin-grid">{featuredServices.map(service => <article key={service.id} className="featured-admin-card"><span className="service-thumb !h-12 !w-12">{service.imageUrl ? <img src={service.imageUrl} alt="" /> : <Star size={18} />}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-extrabold text-white">{locale === 'ar' && service.nameAr ? service.nameAr : service.name}</p><p className="mt-1 text-xs text-[#8d98b7]">#{service.providerId} · {service.category}</p></div><button onClick={() => toggleFeatured(service)} className="icon-button !h-8 !w-8 hover:!border-rose-300 hover:!text-rose-600" aria-label="Remove featured service"><X size={15} /></button></article>)}</div>}
      </section>

      {showBannerModal && <div className="modal-backdrop"><section className="manager-modal" role="dialog" aria-modal="true"><div className="modal-header"><div><div className="eyebrow"><span className="eyebrow-dot" />{text('تحرير المحتوى', 'Content editor')}</div><h3>{editingBanner ? text('تعديل البنر', 'Edit banner') : text('بنر جديد', 'New banner')}</h3></div><button onClick={closeModal} className="icon-button"><X size={18} /></button></div><div className="modal-scroll">
        <div className="banner-editor-preview" style={{ '--banner-accent': bannerForm.accentColor } as CSSProperties}>{bannerForm.imageUrl ? <img src={bannerForm.imageUrl} alt="" /> : <div className="banner-editor-placeholder"><ImagePlus size={26} /></div>}<div><p>{locale === 'ar' ? bannerForm.titleAr || bannerForm.title || text('عنوان البنر', 'Banner title') : bannerForm.title || text('Banner title', 'عنوان البنر')}</p><span>{locale === 'ar' ? bannerForm.subtitleAr || bannerForm.subtitle : bannerForm.subtitle}</span></div></div>
        <div className="grid gap-4 sm:grid-cols-2"><div><label className="input-label">{text('العنوان بالإنجليزية', 'Title in English')} *</label><input value={bannerForm.title} onChange={event => setBannerForm({ ...bannerForm, title: event.target.value })} className="input-field" /></div><div><label className="input-label">{text('العنوان بالعربية', 'Title in Arabic')}</label><input value={bannerForm.titleAr} onChange={event => setBannerForm({ ...bannerForm, titleAr: event.target.value })} className="input-field" dir="rtl" /></div><div><label className="input-label">{text('الوصف بالإنجليزية', 'Subtitle in English')}</label><textarea value={bannerForm.subtitle} onChange={event => setBannerForm({ ...bannerForm, subtitle: event.target.value })} className="input-field min-h-22 resize-y" /></div><div><label className="input-label">{text('الوصف بالعربية', 'Subtitle in Arabic')}</label><textarea value={bannerForm.subtitleAr} onChange={event => setBannerForm({ ...bannerForm, subtitleAr: event.target.value })} className="input-field min-h-22 resize-y" dir="rtl" /></div></div>
        <div className="mt-4"><label className="input-label">{text('رابط صورة البنر', 'Banner image URL')}</label><input value={bannerForm.imageUrl} onChange={event => setBannerForm({ ...bannerForm, imageUrl: event.target.value })} className="input-field" placeholder="https://..." /></div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2"><div><label className="input-label">{text('رابط الزر', 'Button link')}</label><input value={bannerForm.actionUrl} onChange={event => setBannerForm({ ...bannerForm, actionUrl: event.target.value })} className="input-field" placeholder="/dashboard/services أو https://..." /></div><div><label className="input-label">{text('لون الإضاءة', 'Accent color')}</label><div className="flex gap-2"><input type="color" value={bannerForm.accentColor} onChange={event => setBannerForm({ ...bannerForm, accentColor: event.target.value })} className="h-11 w-12 rounded-lg border border-white/10 bg-transparent p-1" /><input value={bannerForm.accentColor} onChange={event => setBannerForm({ ...bannerForm, accentColor: event.target.value })} className="input-field flex-1" /></div></div><div><label className="input-label">{text('نص الزر بالإنجليزية', 'Button label in English')}</label><input value={bannerForm.actionLabel} onChange={event => setBannerForm({ ...bannerForm, actionLabel: event.target.value })} className="input-field" /></div><div><label className="input-label">{text('نص الزر بالعربية', 'Button label in Arabic')}</label><input value={bannerForm.actionLabelAr} onChange={event => setBannerForm({ ...bannerForm, actionLabelAr: event.target.value })} className="input-field" dir="rtl" /></div></div>
        <div className="mt-4 flex items-center justify-between rounded-xl border border-white/[.08] bg-white/[.035] px-4 py-3"><div><p className="text-sm font-bold text-white">{text('إظهار البنر', 'Show banner')}</p><p className="mt-0.5 text-xs text-[#8d98b7]">{text('يمكنك إخفاؤه مؤقتاً بدون حذفه.', 'Hide it temporarily without deleting it.')}</p></div><button onClick={() => setBannerForm({ ...bannerForm, isActive: !bannerForm.isActive })} className={bannerForm.isActive ? 'switch is-on' : 'switch'} aria-label="Toggle banner"><span /></button></div>
      </div><div className="modal-actions"><button onClick={closeModal} className="btn-secondary flex-1">{text('إلغاء', 'Cancel')}</button><button onClick={saveBanner} disabled={saving} className="btn-primary flex-1">{saving ? text('جارٍ الحفظ...', 'Saving...') : text('حفظ البنر', 'Save banner')}</button></div></section></div>}
    </div>
  );
}
