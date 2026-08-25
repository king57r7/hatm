import { useState, type FormEvent } from 'react';
import { useLocation } from 'wouter';
import { ArrowRight, Crown, Globe2, LockKeyhole, Mail, Sparkles, UserRound } from 'lucide-react';
import { useAuth, useLang, useSite } from '../lib/context';

export default function RegisterPage() {
  const { refresh } = useAuth();
  const { t, locale, setLocale, dir } = useLang();
  const { config } = useSite();
  const [, navigate] = useLocation();
  const [form, setForm] = useState({ email: '', username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(form) });
      const data = await response.json();
      if (!response.ok) { setError(data.error || t.error); return; }
      await refresh();
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  return <main className="king-app min-h-screen px-4 py-5 sm:p-7" dir={dir}>
    <div className="absolute end-[5%] top-[9%] h-56 w-56 rounded-full bg-[#7c5cff]/18 blur-3xl" /><div className="absolute start-[9%] bottom-[8%] h-48 w-48 rounded-full bg-[#ffc95c]/10 blur-3xl" />
    <div className="relative mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-6xl items-center justify-center lg:justify-between">
      <section className="order-2 hidden max-w-md lg:order-1 lg:block"><div className="eyebrow"><span className="eyebrow-dot" />{locale === 'ar' ? 'ابدأ بثقة' : 'Start with confidence'}</div><h1 className="mt-5 text-5xl font-extrabold leading-[1.16] tracking-tight text-white">{locale === 'ar' ? 'ابنِ مساحة نموّ خاصة بك.' : 'Build a growth space that is truly yours.'}</h1><p className="mt-5 max-w-sm text-base leading-7 text-[#aeb9d7]">{locale === 'ar' ? 'أنشئ حسابك، اكتشف الخدمات، وابدأ إدارة طلباتك بسهولة من لوحة واحدة متكاملة.' : 'Create your account, discover services, and manage your orders easily from one integrated dashboard.'}</p><div className="mt-9 rounded-2xl border border-white/[.08] bg-white/[.035] p-5"><Sparkles size={21} className="text-[#ffda83]" /><p className="mt-3 text-sm font-bold leading-6 text-[#cad3e9]">{locale === 'ar' ? 'تصميم واضح وتجربة منظمة من أول لحظة.' : 'A clear design and organized experience from the first moment.'}</p></div></section>
      <section className="order-1 w-full max-w-[27rem] lg:order-2"><div className="mb-7 flex items-center justify-between"><div className="flex items-center gap-3">{config.logo ? <img src={config.logo} alt={config.siteName} className="h-11 w-11 rounded-xl object-cover ring-1 ring-white/15" /> : <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#ffe7a7] via-[#ffc95c] to-[#b87c1f] text-[#181326] shadow-[0_12px_26px_rgba(255,196,79,.22)]"><Crown size={22} fill="currentColor" /></span>}<div><strong className="block text-xl font-extrabold tracking-[.12em] text-white">{config.siteName || 'King'}</strong><span className="block text-[10px] font-bold uppercase tracking-[.13em] text-[#8c97b6]">Smart growth panel</span></div></div><button onClick={() => setLocale(locale === 'ar' ? 'en' : 'ar')} className="btn-ghost !rounded-lg !px-2 !py-2 text-xs"><Globe2 size={15} />{locale === 'ar' ? 'EN' : 'ع'}</button></div>
        <div className="glass-panel relative overflow-hidden p-6 sm:p-7"><div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#ffe09c] to-transparent" /><div className="relative"><div className="eyebrow"><span className="eyebrow-dot" />{locale === 'ar' ? 'انضم إلى King' : 'Join King'}</div><h2 className="mt-2 text-2xl font-extrabold text-white">{t.register}</h2><p className="mt-2 text-sm text-[#8d98b7]">{locale === 'ar' ? 'أنشئ حسابك وابدأ رحلتك الآن.' : 'Create your account and start your journey now.'}</p></div>{error && <div className="mt-5 rounded-xl bg-rose-400/10 px-4 py-3 text-sm text-rose-200 ring-1 ring-inset ring-rose-300/20">{error}</div>}<form onSubmit={handleSubmit} className="mt-6 space-y-4"><div><label className="input-label">{t.email}</label><div className="relative"><Mail className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-[#7f8aa7]" size={17} /><input type="email" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} className="input-field !ps-11" placeholder="name@example.com" required /></div></div><div><label className="input-label">{t.username}</label><div className="relative"><UserRound className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-[#7f8aa7]" size={17} /><input value={form.username} onChange={event => setForm({ ...form, username: event.target.value })} className="input-field !ps-11" placeholder={locale === 'ar' ? 'اسم المستخدم' : 'Username'} required /></div></div><div><label className="input-label">{t.password}</label><div className="relative"><LockKeyhole className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-[#7f8aa7]" size={17} /><input type="password" value={form.password} onChange={event => setForm({ ...form, password: event.target.value })} className="input-field !ps-11" placeholder="••••••••" required minLength={6} /></div><p className="mt-2 text-[11px] text-[#73809d]">{locale === 'ar' ? '6 أحرف على الأقل.' : 'At least 6 characters.'}</p></div><button type="submit" disabled={loading} className="btn-primary mt-2 w-full !py-3.5">{loading ? t.loading : <><span>{t.register}</span><ArrowRight size={17} className={dir === 'rtl' ? 'rotate-180' : ''} /></>}</button></form><p className="mt-6 text-center text-sm text-[#8d98b7]">{t.alreadyHaveAccount} <a href="/login" onClick={event => { event.preventDefault(); navigate('/login'); }} className="font-extrabold text-[#ffda83] transition-colors hover:text-white">{t.login}</a></p></div>
      </section>
    </div>
  </main>;
}
