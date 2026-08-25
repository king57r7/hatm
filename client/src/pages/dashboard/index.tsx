import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { ArrowUpRight, CheckCircle2, CircleDollarSign, Clock3, PackageCheck, ShoppingBag } from 'lucide-react';
import { useAuth, useLang } from '../../lib/context';

export default function DashboardPage() {
  const { user } = useAuth();
  const { t, locale } = useLang();
  const [, navigate] = useLocation();
  const [stats, setStats] = useState({ ordersCount: 0, totalSpent: 0, pendingOrders: 0, completedOrders: 0 });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/orders', { credentials: 'include' }).then(response => response.json()).then(data => {
      if (data.orders) {
        setRecentOrders(data.orders.slice(0, 5));
        setStats({
          ordersCount: data.orders.length,
          totalSpent: data.orders.reduce((sum: number, order: any) => sum + order.pricePaid, 0),
          pendingOrders: data.orders.filter((order: any) => order.status === 'PENDING' || order.status === 'IN_PROGRESS').length,
          completedOrders: data.orders.filter((order: any) => order.status === 'COMPLETED').length,
        });
      }
    });
  }, []);

  const statusBadge = (status: string) => {
    const classes: Record<string, string> = { PENDING: 'badge-pending', IN_PROGRESS: 'badge-progress', COMPLETED: 'badge-completed', PARTIAL: 'badge-partial', CANCELED: 'badge-canceled', FAILED: 'badge-failed', REFUNDED: 'badge-refunded' };
    const labels: Record<string, string> = { PENDING: t.pending, IN_PROGRESS: t.inProgress, COMPLETED: t.completed, PARTIAL: t.partial, CANCELED: t.canceled, FAILED: t.failed, REFUNDED: t.refunded };
    return <span className={classes[status] || 'badge-canceled'}><span className="h-1.5 w-1.5 rounded-full bg-current opacity-75" />{labels[status] || status}</span>;
  };

  const completionRate = stats.ordersCount ? Math.round((stats.completedOrders / stats.ordersCount) * 100) : 0;
  const cards = [
    { label: t.balance, value: `$${user?.walletBalance.toFixed(2)}`, detail: locale === 'ar' ? 'رصيد متاح الآن' : 'Available to spend', icon: CircleDollarSign, tint: 'from-[#ffc95c]/20 to-[#f3a638]/5', color: 'text-[#ffda83]' },
    { label: t.totalSpent, value: `$${stats.totalSpent.toFixed(2)}`, detail: locale === 'ar' ? 'إجمالي استخدامك' : 'Your total usage', icon: ShoppingBag, tint: 'from-[#4aa8ff]/20 to-[#5268e7]/5', color: 'text-[#8cc9ff]' },
    { label: t.totalOrders, value: stats.ordersCount.toLocaleString(), detail: locale === 'ar' ? 'طلب عبر المنصة' : 'Orders placed', icon: PackageCheck, tint: 'from-[#9d7cff]/20 to-[#7649db]/5', color: 'text-[#bfadff]' },
    { label: t.completed, value: `${completionRate}%`, detail: locale === 'ar' ? `${stats.completedOrders} طلب مكتمل` : `${stats.completedOrders} orders complete`, icon: CheckCircle2, tint: 'from-[#43d8a4]/20 to-[#238c72]/5', color: 'text-[#72ecc4]' },
  ];

  return (
    <div className="page-shell">
      <section className="relative overflow-hidden rounded-[1.7rem] border border-white/[.08] bg-[linear-gradient(120deg,rgba(43,41,92,.86),rgba(15,22,44,.82)_48%,rgba(14,63,89,.58))] px-5 py-7 shadow-[0_26px_70px_rgba(0,0,0,.24)] sm:px-8 sm:py-9">
        <div className="absolute -end-16 -top-24 h-64 w-64 rounded-full bg-[#9a7bff]/20 blur-3xl" />
        <div className="absolute -bottom-28 start-[40%] h-64 w-64 rounded-full bg-[#42a5ff]/15 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <div className="eyebrow"><span className="eyebrow-dot" />{locale === 'ar' ? 'مساحتك الذكية' : 'Your smart workspace'}</div>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">{locale === 'ar' ? `أهلاً، ${user?.username}` : `Hello, ${user?.username}`}</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[#b8c4e7]">{locale === 'ar' ? 'أدر نموك بثقة. راقب الطلبات، الرصيد، وكل ما تحتاجه من مكان واحد.' : 'Manage growth with confidence. Track orders, balance, and every next move from one place.'}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={() => navigate('/dashboard/services')} className="btn-primary"><ShoppingBag size={17} />{locale === 'ar' ? 'طلب خدمة جديدة' : 'Place new order'}</button>
            <button onClick={() => navigate('/dashboard/wallet')} className="btn-secondary"><ArrowUpRight size={17} />{locale === 'ar' ? 'شحن الرصيد' : 'Top up wallet'}</button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, detail, icon: Icon, tint, color }) => (
          <article key={label} className="stat-card">
            <div className="flex items-start justify-between">
              <span className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${tint} ${color} ring-1 ring-white/10`}><Icon size={21} /></span>
              <span className="flex h-2 w-2 rounded-full bg-[#51e4ae] shadow-[0_0_12px_rgba(81,228,174,.9)]" />
            </div>
            <p className={`mono mt-5 text-2xl font-medium tracking-tight ${color}`}>{value}</p>
            <p className="mt-1 text-sm font-extrabold text-white">{label}</p>
            <p className="metric-label">{detail}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.55fr_.8fr]">
        <article className="card">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div><p className="text-base font-extrabold text-white">{locale === 'ar' ? 'أحدث الطلبات' : 'Recent orders'}</p><p className="mt-1 text-xs text-[#8d98b7]">{locale === 'ar' ? 'متابعة آخر نشاطات حسابك' : 'Follow your latest account activity'}</p></div>
            <button onClick={() => navigate('/dashboard/orders')} className="btn-ghost !px-2 text-xs">{locale === 'ar' ? 'عرض الكل' : 'View all'}<ArrowUpRight size={15} /></button>
          </div>
          {recentOrders.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center text-center"><span className="empty-icon !mb-3 !h-12 !w-12"><PackageCheck size={21} /></span><p className="text-sm font-bold text-white">{t.noOrders}</p><p className="mt-1 text-xs text-[#8d98b7]">{locale === 'ar' ? 'ابدأ باختيار خدمة تناسب احتياجك.' : 'Start by choosing a service that fits your goal.'}</p></div>
          ) : (
            <div className="table-wrap -mx-1">
              <table className="w-full min-w-[590px]">
                <thead><tr><th className="table-header">#</th><th className="table-header">{t.services}</th><th className="table-header">{t.quantity}</th><th className="table-header">{t.price}</th><th className="table-header">{t.status}</th></tr></thead>
                <tbody>{recentOrders.map((order, index) => <tr key={order.id} className="table-row"><td className="table-cell mono text-xs text-[#75809e]">{String(index + 1).padStart(2, '0')}</td><td className="table-cell max-w-[220px] truncate font-bold text-white">{order.service?.name}</td><td className="table-cell mono text-xs">{order.quantity.toLocaleString()}</td><td className="table-cell mono text-xs text-[#ffda83]">${order.pricePaid.toFixed(4)}</td><td className="table-cell">{statusBadge(order.status)}</td></tr>)}</tbody>
              </table>
            </div>
          )}
        </article>

        <article className="card soft-grid">
          <div className="flex items-center justify-between"><div><p className="text-base font-extrabold text-white">{locale === 'ar' ? 'نبذة الأداء' : 'Performance'}</p><p className="mt-1 text-xs text-[#8d98b7]">{locale === 'ar' ? 'حالة نشاطك الحالية' : 'Your current activity health'}</p></div><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#7868ff]/15 text-[#b9afff]"><Clock3 size={19} /></span></div>
          <div className="mt-8 flex items-center gap-5"><div className="relative flex h-24 w-24 items-center justify-center rounded-full" style={{ background: `conic-gradient(#35d39e ${completionRate * 3.6}deg, rgba(255,255,255,.08) 0deg)` }}><div className="flex h-[4.7rem] w-[4.7rem] items-center justify-center rounded-full bg-[#111727]"><span className="mono text-lg text-white">{completionRate}%</span></div></div><div><p className="text-sm font-extrabold text-white">{locale === 'ar' ? 'معدل الإنجاز' : 'Completion rate'}</p><p className="mt-1 max-w-[11rem] text-xs leading-5 text-[#93a0bf]">{stats.ordersCount ? (locale === 'ar' ? 'نسبة الطلبات المكتملة من إجمالي نشاطك.' : 'Completed orders across your overall activity.') : (locale === 'ar' ? 'سيظهر الأداء فور بدء طلباتك.' : 'Your performance will appear after your first order.')}</p></div></div>
          <div className="mt-8 space-y-3"><div className="flex justify-between text-xs"><span className="font-bold text-[#aeb9d6]">{locale === 'ar' ? 'قيد المعالجة' : 'In progress'}</span><span className="mono text-[#8cc9ff]">{stats.pendingOrders}</span></div><div className="h-2 overflow-hidden rounded-full bg-white/[.07]"><div className="h-full rounded-full bg-gradient-to-r from-[#52a7ff] to-[#8374ff] transition-all duration-500" style={{ width: `${stats.ordersCount ? Math.max(8, (stats.pendingOrders / stats.ordersCount) * 100) : 0}%` }} /></div></div>
        </article>
      </section>
    </div>
  );
}
