import { useEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'wouter';
import {
  Activity, ArrowUpRight, BarChart3, Boxes, CreditCard, Gauge,
  Globe2, LayoutDashboard, LogOut, Menu, PackageSearch, Settings,
  ShieldCheck, Users, X,
} from 'lucide-react';
import { useAuth, useLang, useSite } from '../lib/context';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, loading, logout } = useAuth();
  const { t, locale, setLocale, dir } = useLang();
  const { config } = useSite();
  const [location, navigate] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'ADMIN')) navigate('/login');
  }, [user, loading, navigate]);

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center"><div className="king-spinner" /></div>;
  }

  const navItems = [
    { href: '/admin', label: t.dashboard, icon: LayoutDashboard },
    { href: '/admin/users', label: t.users, icon: Users },
    { href: '/admin/providers', label: locale === 'ar' ? 'المزوّدون' : 'Providers', icon: Boxes },
    { href: '/admin/sections', label: locale === 'ar' ? 'الأقسام' : 'Sections', icon: PackageSearch },
    { href: '/admin/services', label: t.services, icon: Activity },
    { href: '/admin/orders', label: t.orders, icon: CreditCard },
    { href: '/admin/topups', label: t.topups, icon: ArrowUpRight },
    { href: '/admin/analytics', label: t.analytics, icon: BarChart3 },
    { href: '/admin/settings', label: t.settings, icon: Settings },
  ];

  const isActive = (href: string) => href === '/admin' ? location === href : location.startsWith(href);
  const go = (href: string) => { navigate(href); setMobileOpen(false); };
  const brandName = config.siteName || 'King';

  return (
    <div className="king-app" dir={dir}>
      {mobileOpen && <button aria-label="Close navigation" className="fixed inset-0 z-40 bg-[#02030a]/70 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />}
      <aside className={`desktop-sidebar fixed inset-y-0 start-0 z-50 flex w-[17.5rem] flex-col border-e border-white/[.08] bg-[#0d1222]/95 px-3 py-4 shadow-2xl backdrop-blur-2xl transition-transform duration-300 lg:translate-x-0 ${mobileOpen ? 'is-open' : ''}`}>
        <div className="flex items-center justify-between px-3 pb-5 pt-1">
          <button onClick={() => go('/admin')} className="flex items-center gap-3 text-start group" aria-label="King admin home">
            {config.logo ? <img src={config.logo} alt={brandName} className="h-10 w-10 rounded-xl object-cover ring-1 ring-white/15" /> : (
              <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#ffe7a7] via-[#ffc95c] to-[#b87c1f] text-lg font-black text-[#181326] shadow-[0_10px_24px_rgba(255,196,79,.24)]">K</span>
            )}
            <span>
              <strong className="block text-lg font-extrabold tracking-[.12em] text-white group-hover:text-[#ffe09c]">{brandName}</strong>
              <span className="mt-0.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.14em] text-[#808aa8]"><ShieldCheck size={12} className="text-[#ffc95c]" /> {locale === 'ar' ? 'إدارة المنصة' : 'Control center'}</span>
            </span>
          </button>
          <button className="icon-button lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X size={18} /></button>
        </div>

        <div className="section-divider" />
        <nav className="flex-1 space-y-1 overflow-y-auto py-4 pe-1">
          <p className="px-3 pb-2 text-[10px] font-extrabold uppercase tracking-[.16em] text-[#5e6885]">{locale === 'ar' ? 'مساحة العمل' : 'Workspace'}</p>
          {navItems.map(({ href, label, icon: Icon }) => (
            <a key={href} href={href} onClick={(event) => { event.preventDefault(); go(href); }} className={isActive(href) ? 'nav-link-active' : 'nav-link'}>
              <Icon size={18} strokeWidth={isActive(href) ? 2.4 : 1.9} />
              <span>{label}</span>
            </a>
          ))}
        </nav>

        <div className="mt-2 rounded-2xl border border-white/[.07] bg-white/[.035] p-3">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#6255cf] to-[#2f92de] text-sm font-black text-white">{user.username.slice(0, 1).toUpperCase()}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white">{user.username}</p>
              <p className="truncate text-[11px] text-[#8994b1]">{user.email}</p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button onClick={() => setLocale(locale === 'ar' ? 'en' : 'ar')} className="btn-ghost !rounded-lg !px-2 !py-2 text-xs"><Globe2 size={14} />{locale === 'ar' ? 'EN' : 'ع'}</button>
            <button onClick={logout} className="btn-ghost !rounded-lg !px-2 !py-2 text-xs hover:!bg-rose-500/15 hover:!text-rose-300"><LogOut size={14} />{t.logout}</button>
          </div>
        </div>
      </aside>

      <main className="min-h-screen lg:ms-[17.5rem]">
        <header className="sticky top-0 z-30 flex h-[4.6rem] items-center justify-between border-b border-white/[.06] bg-[#080a12]/72 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button className="icon-button lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={19} /></button>
            <div className="hidden sm:block"><p className="text-xs font-bold text-[#8792b2]">{locale === 'ar' ? 'لوحة التحكم' : 'Command center'}</p><p className="text-sm font-extrabold text-white">{t.dashboard}</p></div>
          </div>
          <button onClick={() => go('/dashboard')} className="btn-secondary !rounded-lg !px-3 !py-2 text-xs"><Gauge size={15} />{locale === 'ar' ? 'معاينة المستخدم' : 'User view'}</button>
        </header>
        <div className="p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
