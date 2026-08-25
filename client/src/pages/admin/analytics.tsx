import { useEffect, useState } from 'react';
import { useLang } from '../../lib/context';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function AnalyticsPage() {
  const { t, locale } = useLang();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetch('/api/admin/analytics', { credentials: 'include' }).then(r => r.json()).then(d => setData(d)).finally(() => setLoading(false)); }, []);

  if (loading) return <div className="text-center py-12 text-gray-500">{t.loading}</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">{t.analytics}</h1>
      {data?.dailyData?.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-bold text-white mb-4">{locale === 'ar' ? 'الإيرادات اليومية' : 'Daily Revenue'}</h2>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data.dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
              <XAxis dataKey="date" tick={{ fill: '#6b7280', fontSize: 11 }} />
              <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#111', border: '1px solid #1f1f1f', borderRadius: 8 }} />
              <Line type="monotone" dataKey="revenue" stroke="#f59e0b" strokeWidth={2} dot={false} name={locale === 'ar' ? 'الإيرادات' : 'Revenue'} />
              <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} dot={false} name={locale === 'ar' ? 'الأرباح' : 'Profit'} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-bold text-white mb-4">{locale === 'ar' ? 'أفضل الخدمات' : 'Top Services'}</h2>
          <div className="space-y-2">
            {data?.topServices?.map((s: any, i: number) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-[#1a1a1a]">
                <div><p className="text-white text-sm font-medium truncate max-w-[200px]">{s.serviceName}</p><p className="text-gray-500 text-xs">{s.orderCount} {locale === 'ar' ? 'طلب' : 'orders'}</p></div>
                <div className="text-end"><p className="text-amber-500 font-bold text-sm">${s.totalRevenue?.toFixed(2)}</p><p className="text-green-400 text-xs">+${s.totalProfit?.toFixed(2)}</p></div>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <h2 className="text-lg font-bold text-white mb-4">{locale === 'ar' ? 'أعلى المستخدمين إنفاقاً' : 'Top Spenders'}</h2>
          <div className="space-y-2">
            {data?.topUsers?.map((u: any, i: number) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-[#1a1a1a]">
                <div><p className="text-white text-sm font-medium">{u.username}</p><p className="text-gray-500 text-xs">{u.email}</p></div>
                <div className="text-end"><p className="text-amber-500 font-bold text-sm">${u.totalSpent?.toFixed(2)}</p><p className="text-gray-500 text-xs">{locale === 'ar' ? 'رصيد:' : 'Bal:'} ${u.walletBalance?.toFixed(2)}</p></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
