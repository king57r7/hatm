import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, ClipboardList, Search, SlidersHorizontal } from 'lucide-react';
import { useLang } from '../../lib/context';

export default function OrdersPage() {
  const { t, locale } = useLang();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');

  useEffect(() => {
    fetch('/api/orders', { credentials: 'include' }).then(response => response.json()).then(data => setOrders(data.orders || [])).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => orders.filter(order => {
    const query = search.toLowerCase();
    const matchesSearch = !query || order.service?.name?.toLowerCase().includes(query) || order.link?.toLowerCase().includes(query) || order.id?.toLowerCase().includes(query);
    return matchesSearch && (status === 'ALL' || order.status === status);
  }), [orders, search, status]);

  const statusBadge = (value: string) => {
    const map: Record<string, [string, string]> = { PENDING: ['badge-pending', t.pending], IN_PROGRESS: ['badge-progress', t.inProgress], COMPLETED: ['badge-completed', t.completed], PARTIAL: ['badge-partial', t.partial], CANCELED: ['badge-canceled', t.canceled], FAILED: ['badge-failed', t.failed], REFUNDED: ['badge-refunded', t.refunded] };
    const [classes, label] = map[value] || ['badge-canceled', value];
    return <span className={classes}><span className="h-1.5 w-1.5 rounded-full bg-current opacity-75" />{label}</span>;
  };

  const filters = [['ALL', locale === 'ar' ? 'الكل' : 'All'], ['PENDING', t.pending], ['IN_PROGRESS', t.inProgress], ['COMPLETED', t.completed]];

  return <div className="page-shell">
    <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-dot" />{locale === 'ar' ? 'سجل نشاطك' : 'Activity log'}</div><h1 className="page-title mt-2">{t.orders}</h1><p className="page-subtitle">{locale === 'ar' ? 'تابع حالة الطلبات والتفاصيل من مكان واحد.' : 'Follow every order status and detail from one clear place.'}</p></div><div className="rounded-xl border border-white/[.08] bg-white/[.035] px-4 py-3 text-xs font-bold text-[#a9b5d4]"><b className="mono text-base text-[#ffda83]">{orders.length}</b> {locale === 'ar' ? 'طلب إجمالاً' : 'total orders'}</div></div>
    <section className="card !p-3 sm:!p-4"><div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between"><div className="relative flex-1 xl:max-w-xl"><Search className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-[#7883a3]" size={18} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder={locale === 'ar' ? 'ابحث بالخدمة أو الرابط أو رقم الطلب...' : 'Search by service, link or order ID...'} className="input-field !ps-11" /></div><div className="flex items-center gap-2 overflow-x-auto pb-1 xl:pb-0"><SlidersHorizontal size={16} className="shrink-0 text-[#b3a8ff]" />{filters.map(([value, label]) => <button key={value} onClick={() => setStatus(value)} className={status === value ? 'rounded-lg bg-[#ffc95c] px-3 py-2 text-xs font-extrabold text-[#181326] shadow-[0_6px_14px_rgba(255,201,92,.2)]' : 'rounded-lg px-3 py-2 text-xs font-bold text-[#95a0bf] transition-colors hover:bg-white/[.06] hover:text-white'}>{label}</button>)}</div></div></section>
    {loading ? <div className="flex justify-center py-20"><div className="king-spinner" /></div> : filtered.length === 0 ? <div className="empty-state"><span className="empty-icon"><ClipboardList size={28} /></span><p className="text-lg font-extrabold text-white">{search || status !== 'ALL' ? (locale === 'ar' ? 'لا توجد نتائج مطابقة' : 'No matching orders') : t.noOrders}</p><p className="mt-2 text-sm text-[#8d98b7]">{locale === 'ar' ? 'عدّل البحث أو الفلتر للعثور على ما تحتاجه.' : 'Adjust your search or filter to find what you need.'}</p></div> : <section className="table-wrap"><table className="w-full min-w-[860px]"><thead className="bg-white/[.025]"><tr>{[t.services, t.link, t.quantity, t.price, t.status, t.date].map(header => <th key={header} className="table-header">{header}</th>)}</tr></thead><tbody>{filtered.map(order => <tr key={order.id} className="table-row"><td className="table-cell max-w-[250px]"><p className="truncate font-bold text-white">{order.service?.name}</p><p className="mono mt-1 text-[10px] text-[#73809d]">{order.id.slice(0, 8)}</p></td><td className="table-cell max-w-[200px]"><a href={order.link} target="_blank" rel="noreferrer" className="group inline-flex max-w-full items-center gap-1.5 text-[#9fbeff] hover:text-[#ffe09a]"><span className="truncate">{order.link}</span><ArrowUpRight size={14} className="shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></a></td><td className="table-cell mono text-xs">{order.quantity.toLocaleString()}</td><td className="table-cell mono text-xs text-[#ffda83]">${order.pricePaid.toFixed(4)}</td><td className="table-cell">{statusBadge(order.status)}</td><td className="table-cell whitespace-nowrap text-xs text-[#8490ae]">{new Date(order.createdAt).toLocaleDateString(locale === 'ar' ? 'ar' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</td></tr>)}</tbody></table></section>}
  </div>;
}
