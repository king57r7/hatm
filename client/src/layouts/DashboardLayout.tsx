import { useEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'wouter';
import {
  ArrowUpRight, Boxes, ChevronRight, Globe2, LayoutDashboard,
  LogOut, Menu, PackageSearch, Settings2, UserRound, WalletCards, X,
} from 'lucide-react';
import { useAuth, useLang, useSite } from '../lib/context';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, loading, logout } = useAuth();
  const { t, locale, setLocale, dir } = useLang();
  const { config } = useSite();
  const [location, navigate] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate('/login');
  }, [user, loading, navigate]);

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center"><div className="king-spinner" /></div>;
  }

  const navItems = [
    { href: '/dashboard', label: t.dashboard, icon: LayoutDashboard },
    { href: '/dashboard/services', label: t.services, icon: PackageSearch },
    { href: '/dashboard/orders', label: t.orders, icon: Boxes },
    { href: '/dashboard/wallet', label: t.wallet, icon: WalletCards },
    { href: '/dashboard/profile', label: t.profile, icon: UserRound },
  ];
  const isActive = (href: string) => href === '/dashboard' ? location === href : location.startsWith(href);
  const go = (href: string) => { navigate(href); setMobileOpen(false); };
  const brandName = config.siteName || 'King';

  return (
    <div className="king-app" dir={dir}>
      {mobileOpen && <button aria-label="Close navigation" className="fixed inset-0 z-40 bg-[#02030a]/70 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />}
      <aside className={`desktop-sidebar fixed inset-y-0 start-0 z-50 flex w-[17.5rem] flex-col border-e border-white/[.08] bg-[#0d1222]/95 px-3 py-4 shadow-2xl backdrop-blur-2xl transition-transform duration-300 lg:translate-x-0 ${mobileOpen ? 'is-open' : ''}`}>
        <div className="flex items-center justify-between px-3 pb-5 pt-1">
          <button onClick={() => go('/dashboard')} className="flex items-center gap-3 text-start group" aria-label="King home">
            {config.logo ? <img src={config.logo} alt={brandName} className="h-10 w-10 rounded-xl object-cover ring-1 ring-white/15" /> : (
              <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#ffe7a7] via-[#ffc95c] to-[#b87c1f] text-lg font-black text-[#181326] shadow-[0_10px_24px_rgba(255,196,79,.24)]">K</span>
            )}
            <span>
              <strong className="block text-lg font-extrabold tracking-[.12em] text-white group-hover:text-[#ffe09c]">{brandName}</strong>
              <span className="mt-0.5 block text-[10px] font-bold uppercase tracking-[.14em] text-[#808aa8]">{locale === 'ar' ? 'منصتك الذكية' : 'Smart growth panel'}</span>
            </span>
          </button>
          <button className="icon-button lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X size={18} /></button>
        </div>

        <div className="section-divider" />
        <nav className="flex-1 space-y-1 overflow-y-auto py-4 pe-1">
          <p className="px-3 pb-2 text-[10px] font-extrabold uppercase tracking-[.16em] text-[#5e6885]">{locale === 'ar' ? 'التنقّل' : 'Navigation'}</p>
          {navItems.map(({ href, label, icon: Icon }) => (
            <a key={href} href={href} onClick={(event) => { event.preventDefault(); go(href); }} className={isActive(href) ? 'nav-link-active' : 'nav-link'}>
              <Icon size={18} strokeWidth={isActive(href) ? 2.4 : 1.9} />
              <span>{label}</span>
            </a>
          ))}
        </nav>

        <div className="overflow-hidden rounded-2xl border border-[#ffc95c]/20 bg-[linear-gradient(135deg,rgba(255,201,92,.16),rgba(94,83,222,.12))] p-4 shadow-[0_15px_35px_rgba(0,0,0,.18)]">
          <div className="flex items-start justify-between">
            <div><p className="text-[11px] font-bold text-[#cabf99]">{t.balance}</p><p className="mono mt-1 text-xl font-medium tracking-tight text-[#ffe6a3]">${user.walletBalance.toFixed(2)}</p></div>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#ffc95c]/14 text-[#ffd875]"><WalletCards size={18} /></span>
          </div>
          <button onClick={() => go('/dashboard/wallet')} className="mt-3 flex w-full items-center justify-between text-xs font-bold text-[#f4dfad] hover:text-white"><span>{locale === 'ar' ? 'إضافة رصيد' : 'Add balance'}</span><ArrowUpRight size={15} /></button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 px-1">
          <button onClick={() => setLocale(locale === 'ar' ? 'en' : 'ar')} className="btn-ghost !rounded-lg !px-2 !py-2 text-xs"><Globe2 size={14} />{locale === 'ar' ? 'EN' : 'ع'}</button>
          <button onClick={logout} className="btn-ghost !rounded-lg !px-2 !py-2 text-xs hover:!bg-rose-500/15 hover:!text-rose-300"><LogOut size={14} />{t.logout}</button>
        </div>
      </aside>

      <main className="min-h-screen lg:ms-[17.5rem]">
        <header className="sticky top-0 z-30 flex h-[4.6rem] items-center justify-between border-b border-white/[.06] bg-[#080a12]/72 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button className="icon-button lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={19} /></button>
            <div className="hidden sm:block"><p className="text-xs font-bold text-[#8792b2]">{locale === 'ar' ? 'مرحباً بعودتك' : 'Welcome back'}</p><p className="text-sm font-extrabold text-white">{user.username}</p></div>
          </div>
          <button onClick={() => go('/dashboard/services')} className="btn-primary !rounded-lg !px-3 !py-2 text-xs"><span>{locale === 'ar' ? 'استكشف الخدمات' : 'Browse services'}</span><ChevronRight size={15} className={dir === 'rtl' ? 'rotate-180' : ''} /></button>
        </header>
        <div className="p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
