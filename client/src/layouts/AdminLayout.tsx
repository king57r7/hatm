import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth, useLang, useSite } from '../lib/context';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const { t, locale, setLocale, dir } = useLang();
  const { config } = useSite();
  const [location, navigate] = useLocation();

  useEffect(() => { if (!loading && (!user || user.role !== 'ADMIN')) navigate('/login'); }, [user, loading, navigate]);

  if (loading || !user) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="w-12 h-12 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const navItems = [
    { href: '/admin', label: t.dashboard, icon: '📊' },
    { href: '/admin/users', label: t.users, icon: '👥' },
    { href: '/admin/providers', label: locale === 'ar' ? 'المزودون' : 'Providers', icon: '🔌' },
    { href: '/admin/sections', label: locale === 'ar' ? 'الأقسام' : 'Sections', icon: '🗂️' },
    { href: '/admin/services', label: t.services, icon: '🛍️' },
    { href: '/admin/orders', label: t.orders, icon: '📦' },
    { href: '/admin/topups', label: t.topups, icon: '💳' },
    { href: '/admin/analytics', label: t.analytics, icon: '📈' },
    { href: '/admin/settings', label: t.settings, icon: '⚙️' },
  ];

  const isActive = (href: string) => href === '/admin' ? location === href : location.startsWith(href);

  return (
    <div className="min-h-screen bg-[#0a0a0a]" dir={dir}>
      <aside className="fixed top-0 start-0 h-full w-64 bg-[#0d0d0d] border-e border-[#1f1f1f] z-40 flex flex-col">
        <div className="p-6 border-b border-[#1f1f1f]">
          <div className="flex items-center gap-3">
            {config.logo ? <img src={config.logo} alt="logo" className="w-10 h-10 rounded-xl object-cover" /> :
              <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center">
                <span className="text-black font-black text-lg">{config.siteName[0]?.toUpperCase() || 'H'}</span>
              </div>}
            <div>
              <span className="text-amber-500 font-black text-xl tracking-wider">{config.siteName}</span>
              <p className="text-xs text-gray-600">{locale === 'ar' ? 'لوحة الإدارة' : 'Admin Panel'}</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map(item => (
            <a key={item.href} href={item.href} onClick={e => { e.preventDefault(); navigate(item.href); }}
              className={isActive(item.href) ? 'nav-link-active' : 'nav-link'}>
              <span>{item.icon}</span><span>{item.label}</span>
            </a>
          ))}
        </nav>
        <div className="p-4 border-t border-[#1f1f1f] space-y-2">
          <a href="/dashboard" onClick={e => { e.preventDefault(); navigate('/dashboard'); }} className="btn-secondary w-full text-sm text-center block">
            {locale === 'ar' ? '← لوحة المستخدم' : '← User Panel'}
          </a>
          <button onClick={() => setLocale(locale === 'ar' ? 'en' : 'ar')} className="btn-secondary w-full text-sm">
            {locale === 'ar' ? '🌐 English' : '🌐 عربي'}
          </button>
          <button onClick={logout} className="btn-danger w-full text-sm">{t.logout}</button>
        </div>
      </aside>
      <main className="ms-64 min-h-screen"><div className="p-6">{children}</div></main>
    </div>
  );
}
