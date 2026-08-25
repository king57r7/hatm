import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { messages, Locale, Messages } from './i18n';

interface User { id: string; email: string; username: string; role: string; walletBalance: number; totalSpent: number; }
interface SiteConfig { siteName: string; logo: string | null; priceMultiplier: number; }
interface AuthContextType { user: User | null; loading: boolean; refresh: () => Promise<void>; logout: () => Promise<void>; }
interface LangContextType { locale: Locale; t: Messages; setLocale: (l: Locale) => void; dir: 'rtl' | 'ltr'; }
interface SiteContextType { config: SiteConfig; refreshConfig: () => Promise<void>; }

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, refresh: async () => {}, logout: async () => {} });
const LangContext = createContext<LangContextType>({ locale: 'ar', t: messages.ar, setLocale: () => {}, dir: 'rtl' });
const SiteContext = createContext<SiteContextType>({ config: { siteName: 'HATM', logo: null, priceMultiplier: 1 }, refreshConfig: async () => {} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    try { const r = await fetch('/api/auth/me', { credentials: 'include' }); const d = await r.json(); setUser(d.user || null); }
    catch { setUser(null); } finally { setLoading(false); }
  }, []);
  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }); setUser(null); window.location.href = '/login';
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  return <AuthContext.Provider value={{ user, loading, refresh, logout }}>{children}</AuthContext.Provider>;
}

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('ar');
  useEffect(() => { const s = localStorage.getItem('hatm_lang') as Locale; if (s === 'ar' || s === 'en') setLocaleState(s); }, []);
  const setLocale = (l: Locale) => { setLocaleState(l); localStorage.setItem('hatm_lang', l); };
  return <LangContext.Provider value={{ locale, t: messages[locale], setLocale, dir: locale === 'ar' ? 'rtl' : 'ltr' }}>{children}</LangContext.Provider>;
}

export function SiteProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<SiteConfig>({ siteName: 'HATM', logo: null, priceMultiplier: 1 });
  const refreshConfig = useCallback(async () => {
    try { const r = await fetch('/api/public/settings'); const d = await r.json(); setConfig({ siteName: d.siteName || 'HATM', logo: d.logo || null, priceMultiplier: d.priceMultiplier || 1 }); }
    catch {}
  }, []);
  useEffect(() => { refreshConfig(); }, [refreshConfig]);
  return <SiteContext.Provider value={{ config, refreshConfig }}>{children}</SiteContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
export const useLang = () => useContext(LangContext);
export const useSite = () => useContext(SiteContext);
