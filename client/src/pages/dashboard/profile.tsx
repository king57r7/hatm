import { useState } from 'react';
import { useAuth, useLang } from '../../lib/context';

export default function ProfilePage() {
  const { user } = useAuth();
  const { t, locale } = useLang();
  const [password, setPassword] = useState({ current: '', new: '', confirm: '' });
  const [msg, setMsg] = useState('');

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.new !== password.confirm) { setMsg('❌ ' + (locale === 'ar' ? 'كلمات المرور غير متطابقة' : 'Passwords do not match')); return; }
    const res = await fetch('/api/auth/change-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ currentPassword: password.current, newPassword: password.new }) });
    const d = await res.json();
    if (res.ok) { setMsg('✅ ' + (locale === 'ar' ? 'تم تغيير كلمة المرور' : 'Password changed')); setPassword({ current: '', new: '', confirm: '' }); }
    else setMsg('❌ ' + d.error);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">{t.profile}</h1>
      <div className="card">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-amber-500 rounded-2xl flex items-center justify-center"><span className="text-black font-black text-2xl">{user?.username[0]?.toUpperCase()}</span></div>
          <div><h2 className="text-xl font-bold text-white">{user?.username}</h2><p className="text-gray-400">{user?.email}</p><span className={`text-xs px-2 py-0.5 rounded mt-1 inline-block ${user?.role === 'ADMIN' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'}`}>{user?.role}</span></div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {[{ label: t.balance, value: `$${user?.walletBalance.toFixed(2)}`, color: 'text-amber-500' }, { label: t.totalSpent, value: `$${user?.totalSpent.toFixed(2)}`, color: 'text-red-400' }].map((s, i) => (
            <div key={i} className="card-sm"><p className="text-gray-500 text-sm">{s.label}</p><p className={`text-xl font-bold mt-1 ${s.color}`}>{s.value}</p></div>
          ))}
        </div>
      </div>
      <div className="card">
        <h2 className="text-lg font-bold text-white mb-4">{locale === 'ar' ? 'تغيير كلمة المرور' : 'Change Password'}</h2>
        {msg && <div className="mb-4 text-sm bg-[#1a1a1a] px-4 py-3 rounded-lg text-amber-400">{msg}</div>}
        <form onSubmit={changePassword} className="space-y-3">
          <input type="password" value={password.current} onChange={e => setPassword({ ...password, current: e.target.value })} placeholder={locale === 'ar' ? 'كلمة المرور الحالية' : 'Current password'} className="input-field" required />
          <input type="password" value={password.new} onChange={e => setPassword({ ...password, new: e.target.value })} placeholder={locale === 'ar' ? 'كلمة المرور الجديدة' : 'New password'} className="input-field" required minLength={6} />
          <input type="password" value={password.confirm} onChange={e => setPassword({ ...password, confirm: e.target.value })} placeholder={locale === 'ar' ? 'تأكيد كلمة المرور' : 'Confirm password'} className="input-field" required />
          <button type="submit" className="btn-primary">{t.save}</button>
        </form>
      </div>
    </div>
  );
}
