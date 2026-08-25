import { useState, type FormEvent } from 'react';
import { BadgeCheck, CircleDollarSign, KeyRound, ShieldCheck, UserRound } from 'lucide-react';
import { useAuth, useLang } from '../../lib/context';

export default function ProfilePage() {
  const { user } = useAuth();
  const { t, locale } = useLang();
  const [password, setPassword] = useState({ current: '', new: '', confirm: '' });
  const [msg, setMsg] = useState('');

  const changePassword = async (event: FormEvent) => {
    event.preventDefault();
    if (password.new !== password.confirm) {
      setMsg(locale === 'ar' ? 'كلمتا المرور غير متطابقتين.' : 'The new passwords do not match.');
      return;
    }
    const response = await fetch('/api/auth/change-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ currentPassword: password.current, newPassword: password.new }) });
    const data = await response.json();
    if (response.ok) {
      setMsg(locale === 'ar' ? 'تم تغيير كلمة المرور بنجاح.' : 'Your password has been updated.');
      setPassword({ current: '', new: '', confirm: '' });
    } else setMsg(data.error || t.error);
  };

  const isSuccess = msg.includes('بنجاح') || msg.includes('updated');
  return <div className="page-shell">
    <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-dot" />{locale === 'ar' ? 'إدارة الحساب' : 'Account management'}</div><h1 className="page-title mt-2">{t.profile}</h1><p className="page-subtitle">{locale === 'ar' ? 'معلومات حسابك وإعدادات الحماية الأساسية.' : 'Your account details and essential security settings.'}</p></div></div>
    <section className="relative overflow-hidden rounded-[1.6rem] border border-white/[.08] bg-[linear-gradient(120deg,rgba(94,76,186,.38),rgba(16,23,42,.86)_52%,rgba(22,106,133,.25))] p-6 shadow-[0_20px_50px_rgba(0,0,0,.2)] sm:p-8"><div className="absolute -end-12 -top-16 h-48 w-48 rounded-full bg-[#ffc95c]/11 blur-3xl" /><div className="relative flex flex-col gap-6 sm:flex-row sm:items-center"><span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[1.4rem] bg-gradient-to-br from-[#ffe5a8] via-[#ffc95c] to-[#b97925] text-3xl font-black text-[#1a1729] shadow-[0_16px_32px_rgba(255,201,92,.2)]">{user?.username[0]?.toUpperCase()}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="truncate text-2xl font-extrabold text-white">{user?.username}</h2><span className="inline-flex items-center gap-1 rounded-full bg-[#42a5ff]/12 px-2.5 py-1 text-[10px] font-extrabold text-[#8fcaff] ring-1 ring-inset ring-[#42a5ff]/20"><BadgeCheck size={12} />{user?.role === 'ADMIN' ? (locale === 'ar' ? 'مدير' : 'Administrator') : (locale === 'ar' ? 'حساب نشط' : 'Active account')}</span></div><p className="mt-2 text-sm text-[#b2bddb]">{user?.email}</p><p className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-[#bfc7df]"><ShieldCheck size={15} className="text-[#72ecc4]" />{locale === 'ar' ? 'حسابك محمي وجاهز للاستخدام.' : 'Your account is protected and ready to use.'}</p></div></div></section>
    <section className="grid gap-4 sm:grid-cols-2"><article className="stat-card"><div className="flex items-start justify-between"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#ffc95c]/14 text-[#ffda83]"><CircleDollarSign size={21} /></span></div><p className="mono mt-5 text-2xl text-[#ffda83]">${user?.walletBalance.toFixed(2)}</p><p className="mt-1 text-sm font-extrabold text-white">{t.balance}</p><p className="metric-label">{locale === 'ar' ? 'الرصيد المتاح للطلبات' : 'Available order balance'}</p></article><article className="stat-card"><div className="flex items-start justify-between"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#ff7a93]/12 text-[#ff98ab]"><UserRound size={21} /></span></div><p className="mono mt-5 text-2xl text-[#ffadbb]">${user?.totalSpent.toFixed(2)}</p><p className="mt-1 text-sm font-extrabold text-white">{t.totalSpent}</p><p className="metric-label">{locale === 'ar' ? 'إجمالي قيمة الخدمات' : 'Total service value'}</p></article></section>
    <section className="card max-w-3xl"><div className="mb-6 flex items-start gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#7868ff]/15 text-[#bcb3ff]"><KeyRound size={19} /></span><div><h2 className="text-lg font-extrabold text-white">{locale === 'ar' ? 'تغيير كلمة المرور' : 'Change password'}</h2><p className="mt-1 text-xs text-[#8d98b7]">{locale === 'ar' ? 'استخدم كلمة مرور قوية لا تقل عن 6 أحرف.' : 'Use a strong password of at least 6 characters.'}</p></div></div>{msg && <div className={`mb-5 rounded-xl px-4 py-3 text-sm ${isSuccess ? 'bg-emerald-400/10 text-emerald-200 ring-1 ring-emerald-300/20' : 'bg-rose-400/10 text-rose-200 ring-1 ring-rose-300/20'}`}>{msg}</div>}<form onSubmit={changePassword} className="grid gap-4 sm:grid-cols-2"><div className="sm:col-span-2"><label className="input-label">{locale === 'ar' ? 'كلمة المرور الحالية' : 'Current password'}</label><input type="password" value={password.current} onChange={event => setPassword({ ...password, current: event.target.value })} className="input-field" required /></div><div><label className="input-label">{locale === 'ar' ? 'كلمة المرور الجديدة' : 'New password'}</label><input type="password" value={password.new} onChange={event => setPassword({ ...password, new: event.target.value })} className="input-field" required minLength={6} /></div><div><label className="input-label">{locale === 'ar' ? 'تأكيد كلمة المرور' : 'Confirm password'}</label><input type="password" value={password.confirm} onChange={event => setPassword({ ...password, confirm: event.target.value })} className="input-field" required minLength={6} /></div><div className="sm:col-span-2"><button type="submit" className="btn-primary"><KeyRound size={16} />{t.save}</button></div></form></section>
  </div>;
}
