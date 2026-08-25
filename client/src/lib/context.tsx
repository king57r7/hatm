import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { messages, Locale, Messages } from './i18n';

interface User { id: string; email: string; username: string; role: string; walletBalance: number; totalSpent: number; }
interface SiteConfig { siteName: string; logo: string | null; priceMultiplier: number; }
interface AuthContextType { user: User | null; loading: boolean; refresh: () => Promise<void>; logout: () => Promise<void>; }
interface LangContextType { locale: Locale; t: Messages; setLocale: (l: Locale) => void; dir: 'rtl' | 'ltr'; }
interface SiteContextType { config: SiteConfig; refreshConfig: () => Promise<void>; }

const defaultConfig: SiteConfig = { siteName: 'King', logo: null, priceMultiplier: 1 };
const AuthContext = createContext<AuthContextType>({ user: null, loading: true, refresh: async () => {}, logout: async () => {} });
const LangContext = createContext<LangContextType>({ locale: 'ar', t: messages.ar, setLocale: () => {}, dir: 'rtl' });
const SiteContext = createContext<SiteContextType>({ config: defaultConfig, refreshConfig: async () => {} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/me', { credentials: 'include' });
      const data = await response.json();
      setUser(data.user || null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);
  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    setUser(null);
    window.location.href = '/login';
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  return <AuthContext.Provider value={{ user, loading, refresh, logout }}>{children}</AuthContext.Provider>;
}

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('ar');
  useEffect(() => {
    const stored = (localStorage.getItem('king_lang') || localStorage.getItem('hatm_lang')) as Locale;
    if (stored === 'ar' || stored === 'en') setLocaleState(stored);
  }, []);
  const setLocale = (language: Locale) => {
    setLocaleState(language);
    localStorage.setItem('king_lang', language);
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  };
  return <LangContext.Provider value={{ locale, t: messages[locale], setLocale, dir: locale === 'ar' ? 'rtl' : 'ltr' }}>{children}</LangContext.Provider>;
}

export function SiteProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<SiteConfig>(defaultConfig);
  const refreshConfig = useCallback(async () => {
    try {
      const response = await fetch('/api/public/settings');
      const data = await response.json();
      const receivedName = typeof data.siteName === 'string' ? data.siteName.trim() : '';
      const siteName = !receivedName || receivedName.toLowerCase() === 'hatm' ? 'King' : receivedName;
      setConfig({ siteName, logo: data.logo || null, priceMultiplier: data.priceMultiplier || 1 });
      document.title = `${siteName} — Smart Growth Panel`;
    } catch {
      document.title = 'King — Smart Growth Panel';
    }
  }, []);
  useEffect(() => { refreshConfig(); }, [refreshConfig]);
  return <SiteContext.Provider value={{ config, refreshConfig }}>{children}</SiteContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
export const useLang = () => useContext(LangContext);
export const useSite = () => useContext(SiteContext);
