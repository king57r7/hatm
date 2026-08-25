import { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth, useLang, useSite } from '../lib/context';

export default function RegisterPage() {
  const { refresh } = useAuth();
  const { t, locale, setLocale } = useLang();
  const { config } = useSite();
  const [, navigate] = useLocation();
  const [form, setForm] = useState({ email: '', username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const res = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || t.error); return; }
      await refresh(); navigate('/dashboard');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
      <div className="absolute top-4 end-4">
        <button onClick={() => setLocale(locale === 'ar' ? 'en' : 'ar')} className="btn-secondary text-sm px-3 py-1">{locale === 'ar' ? 'EN' : 'عربي'}</button>
      </div>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          {config.logo ? <img src={config.logo} alt="logo" className="w-20 h-20 rounded-2xl mx-auto mb-4 object-cover" /> :
            <div className="w-20 h-20 bg-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/20">
              <span className="text-black font-black text-3xl">{config.siteName[0] || 'H'}</span>
            </div>}
          <h1 className="text-4xl font-black text-amber-500 tracking-widest">{config.siteName}</h1>
        </div>
        <div className="card">
          <h2 className="text-xl font-bold text-white mb-6">{t.register}</h2>
          {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-400 text-sm mb-2">{t.email}</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="input-field" required />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-2">{t.username}</label>
              <input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} className="input-field" required />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-2">{t.password}</label>
              <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="input-field" required minLength={6} />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base">{loading ? t.loading : t.register}</button>
          </form>
          <p className="text-center text-gray-500 mt-6 text-sm">
            {t.alreadyHaveAccount}{' '}
            <a href="/login" onClick={e => { e.preventDefault(); navigate('/login'); }} className="text-amber-500 hover:text-amber-400 font-semibold">{t.login}</a>
          </p>
        </div>
      </div>
    </div>
  );
}
