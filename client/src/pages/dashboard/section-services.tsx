import { useEffect, useMemo, useState } from 'react';
import { useLocation, useParams } from 'wouter';
import { ArrowLeft, ArrowRight, CheckCircle2, CircleDollarSign, ExternalLink, ImageIcon, PackageSearch, Search, ShieldCheck, SlidersHorizontal, X } from 'lucide-react';
import { useLang, useAuth } from '../../lib/context';

export default function SectionServicesPage() {
  const { t, locale, dir } = useLang();
  const { user, refresh } = useAuth();
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const [section, setSection] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [order, setOrder] = useState<{ service: any; link: string; qty: string } | null>(null);
  const [placing, setPlacing] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!params.id) return;
    setLoading(true);
    fetch(`/api/sections/${params.id}/services`, { credentials: 'include' }).then(response => response.json()).then(data => {
      setSection(data.section || null);
      setServices(data.services || []);
    }).finally(() => setLoading(false));
  }, [params.id]);

  const filtered = useMemo(() => services.filter(service => {
    const query = search.toLowerCase();
    return !query || service.name.toLowerCase().includes(query) || service.category?.toLowerCase().includes(query) || service.nameAr?.includes(search);
  }), [services, search]);
  const cost = order ? ((order.service.finalPricePerK / 1000) * (parseInt(order.qty) || 0)) : 0;

  const placeOrder = async () => {
    if (!order) return;
    setPlacing(true);
    setMsg('');
    try {
      let serviceId = order.service.id;
      if (order.service.fromProvider) {
        const response = await fetch('/api/services/add-by-id', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ providerServiceId: order.service.providerId, apiProviderConfigId: order.service.apiProviderConfigId }) });
        const data = await response.json();
        if (!response.ok) { setMsg(data.error); return; }
        serviceId = data.service.id;
      }
      const response = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ serviceId, link: order.link, quantity: parseInt(order.qty) }) });
      const data = await response.json();
      if (response.ok) {
        setMsg(locale === 'ar' ? 'تم إرسال طلبك بنجاح.' : 'Your order was placed successfully.');
        await refresh();
        window.setTimeout(() => { setOrder(null); navigate('/dashboard/orders'); }, 1200);
      } else setMsg(data.error || t.error);
    } finally {
      setPlacing(false);
    }
  };

  const BackIcon = dir === 'rtl' ? ArrowRight : ArrowLeft;
  if (loading) return <div className="flex items-center justify-center py-28"><div className="king-spinner" /></div>;

  return (
    <div className="page-shell">
      <div className="page-heading">
        <div className="flex items-start gap-4"><button onClick={() => navigate('/dashboard/services')} className="icon-button mt-1" aria-label="Back"><BackIcon size={18} /></button>{section && <><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-2xl ring-1 ring-white/10" style={{ backgroundColor: `${section.color}24` }}>{section.icon}</div><div><div className="eyebrow"><span className="eyebrow-dot" />{locale === 'ar' ? 'اختيار الخدمة' : 'Service selection'}</div><h1 className="page-title mt-1">{locale === 'ar' ? section.nameAr : section.name}</h1>{(section.descriptionAr || section.description) && <p className="page-subtitle">{locale === 'ar' ? section.descriptionAr : section.description}</p>}</div></>}</div>
        <div className="hidden items-center gap-2 rounded-xl border border-white/[.08] bg-white/[.035] px-4 py-3 text-xs font-bold text-[#a9b5d4] sm:flex"><PackageSearch size={16} className="text-[#ffc95c]" /><span>{filtered.length} {locale === 'ar' ? 'خدمة مطابقة' : 'matching services'}</span></div>
      </div>

      <section className="card !p-3 sm:!p-4"><div className="flex flex-col gap-3 md:flex-row md:items-center"><div className="relative flex-1"><Search className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-[#7883a3]" size={18} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder={locale === 'ar' ? 'ابحث باسم الخدمة أو الفئة...' : 'Search by service or category...'} className="input-field !ps-11" /></div><div className="flex items-center gap-2 rounded-xl bg-white/[.035] px-3 py-3 text-xs text-[#97a2c0]"><SlidersHorizontal size={16} className="text-[#b3a8ff]" />{locale === 'ar' ? `${filtered.length} خدمة` : `${filtered.length} services`}</div></div></section>

      {filtered.length === 0 ? <div className="empty-state"><span className="empty-icon"><Search size={28} /></span><p className="text-lg font-extrabold text-white">{t.noServices}</p><p className="mt-2 text-sm text-[#8d98b7]">{locale === 'ar' ? 'جرّب عبارة بحث مختلفة أو عُد إلى الأقسام.' : 'Try a different search phrase or return to categories.'}</p></div> : (
        <section className="space-y-3">
          {filtered.map((service, index) => <article key={service.id || index} className="group relative overflow-hidden rounded-[1.3rem] border border-white/[.075] bg-[rgba(15,19,34,.74)] p-5 shadow-[0_14px_32px_rgba(0,0,0,.14)] transition-all duration-300 hover:border-[#b4a5ff]/30 hover:bg-[rgba(20,25,45,.9)] sm:p-6">
            <div className="absolute -end-12 -top-16 h-40 w-40 rounded-full bg-[#7967ff]/0 blur-3xl transition-all duration-500 group-hover:bg-[#7967ff]/10" />
            <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 flex-1 gap-4">
                <div className="catalog-service-image">{service.imageUrl ? <img src={service.imageUrl} alt="" /> : <ImageIcon size={21} />}</div>
                <div className="min-w-0 flex-1"><div className="mb-3 flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#ffc95c]/10 px-2.5 py-1 text-[10px] font-extrabold text-[#ffd978] ring-1 ring-inset ring-[#ffc95c]/15">{service.category}</span>{service.refill && <span className="inline-flex items-center gap-1 rounded-full bg-[#53a8ff]/10 px-2.5 py-1 text-[10px] font-extrabold text-[#8ecbff] ring-1 ring-inset ring-[#53a8ff]/15"><CheckCircle2 size={12} />{locale === 'ar' ? 'إعادة تعبئة' : 'Refill'}</span>}{service.cancel && <span className="inline-flex items-center gap-1 rounded-full bg-[#b698ff]/10 px-2.5 py-1 text-[10px] font-extrabold text-[#c5b6ff] ring-1 ring-inset ring-[#b698ff]/15"><ShieldCheck size={12} />{locale === 'ar' ? 'قابل للإلغاء' : 'Cancelable'}</span>}</div><h2 className="max-w-2xl text-base font-extrabold leading-6 text-white">{locale === 'ar' && service.nameAr ? service.nameAr : service.name}</h2><div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-[#8e99b8]"><span className="mono">#{service.providerId}</span><span>{t.min}: <b className="text-[#bdc7e2]">{service.min?.toLocaleString()}</b></span><span>{t.max}: <b className="text-[#bdc7e2]">{service.max?.toLocaleString()}</b></span></div></div></div>
              <div className="flex items-end justify-between gap-4 border-t border-white/[.06] pt-4 lg:items-center lg:border-s lg:border-t-0 lg:ps-6 lg:pt-0"><div className="text-start lg:text-end"><p className="mono text-2xl font-medium tracking-tight text-[#ffdc89]">${service.finalPricePerK?.toFixed(3)}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-[#7f8aa7]">{t.perThousand}</p></div><button onClick={() => { setOrder({ service, link: '', qty: String(service.min) }); setMsg(''); }} className="btn-primary whitespace-nowrap"><CircleDollarSign size={16} />{t.orderNow}</button></div>
            </div>
          </article>)}
        </section>
      )}

      {order && <div className="fixed inset-0 z-[60] flex items-end bg-[#03040b]/78 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-5"><section className="relative w-full overflow-hidden rounded-t-[1.8rem] border border-white/[.1] bg-[#12182a] shadow-2xl sm:max-w-xl sm:rounded-[1.6rem]" role="dialog" aria-modal="true"><div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#ffe09c] to-transparent" /><div className="flex items-start justify-between border-b border-white/[.07] p-5 sm:p-6"><div><div className="eyebrow"><span className="eyebrow-dot" />{locale === 'ar' ? 'طلب آمن' : 'Secure order'}</div><h3 className="mt-2 text-xl font-extrabold text-white">{t.newOrder}</h3></div><button onClick={() => { setOrder(null); setMsg(''); }} className="icon-button"><X size={18} /></button></div><div className="max-h-[70vh] overflow-y-auto p-5 sm:p-6"><div className="rounded-xl border border-white/[.07] bg-black/15 p-4"><p className="line-clamp-2 text-sm font-bold text-white">{locale === 'ar' && order.service.nameAr ? order.service.nameAr : order.service.name}</p><p className="mt-1 text-xs text-[#8d98b7]">{order.service.category} · #{order.service.providerId}</p></div>{msg && <div className={`mt-4 flex items-start gap-2 rounded-xl px-4 py-3 text-sm ${msg.includes('بنجاح') || msg.includes('successfully') ? 'bg-emerald-400/10 text-emerald-200 ring-1 ring-emerald-300/20' : 'bg-rose-400/10 text-rose-200 ring-1 ring-rose-300/20'}`}><CheckCircle2 size={18} className="mt-0.5 shrink-0" />{msg}</div>}<div className="mt-4 space-y-4"><div><label className="input-label">{t.link}</label><div className="relative"><ExternalLink className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-[#7e89a8]" size={17} /><input value={order.link} onChange={event => setOrder({ ...order, link: event.target.value })} placeholder="https://..." className="input-field !ps-11" /></div></div><div><label className="input-label">{t.quantity} <span className="font-normal text-[#77829f]">({order.service.min?.toLocaleString()} — {order.service.max?.toLocaleString()})</span></label><input type="number" value={order.qty} onChange={event => setOrder({ ...order, qty: event.target.value })} min={order.service.min} max={order.service.max} className="input-field" /></div><div className="grid grid-cols-2 gap-3"><div className="card-sm"><p className="text-[11px] font-bold text-[#8792b0]">{locale === 'ar' ? 'التكلفة التقديرية' : 'Estimated cost'}</p><p className="mono mt-1 text-lg text-[#ffda83]">${cost.toFixed(4)}</p></div><div className="card-sm"><p className="text-[11px] font-bold text-[#8792b0]">{t.balance}</p><p className={`mono mt-1 text-lg ${(user?.walletBalance || 0) >= cost ? 'text-[#72ecc4]' : 'text-[#ff8fa3]'}`}>${user?.walletBalance.toFixed(2)}</p></div></div>{(user?.walletBalance || 0) < cost && <p className="text-center text-xs font-bold text-[#ff8fa3]">{t.insufficientBalance}</p>}</div></div><div className="flex gap-3 border-t border-white/[.07] p-5 sm:p-6"><button onClick={() => { setOrder(null); setMsg(''); }} className="btn-secondary flex-1">{t.cancel}</button><button onClick={placeOrder} disabled={placing || !order.link || cost <= 0 || cost > (user?.walletBalance || 0)} className="btn-primary flex-1">{placing ? t.loading : t.confirm}</button></div></section></div>}
    </div>
  );
}
