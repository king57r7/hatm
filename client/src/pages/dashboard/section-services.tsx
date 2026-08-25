import { useEffect, useState } from 'react';
import { useLocation, useParams } from 'wouter';
import { useLang, useAuth } from '../../lib/context';

export default function SectionServicesPage() {
  const { t, locale } = useLang();
  const { user, refresh } = useAuth();
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const [section, setSection] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [order, setOrder] = useState<{ service: any; link: string; qty: string } | null>(null);
  const [placing, setPlacing] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!params.id) return;
    setLoading(true);
    fetch(`/api/sections/${params.id}/services`, { credentials: 'include' })
      .then(r => r.json()).then(d => { setSection(d.section || null); setServices(d.services || []); }).finally(() => setLoading(false));
  }, [params.id]);

  const filtered = services.filter(s => !search || s.name.toLowerCase().includes(search.toLowerCase()));
  const cost = order ? ((order.service.finalPricePerK / 1000) * (parseInt(order.qty) || 0)) : 0;

  const placeOrder = async () => {
    if (!order) return;
    setPlacing(true); setMsg('');
    try {
      let serviceId = order.service.id;
      if (order.service.fromProvider) {
        const r = await fetch('/api/services/add-by-id', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ providerServiceId: order.service.providerId, apiProviderConfigId: order.service.apiProviderConfigId }) });
        const d = await r.json();
        if (!r.ok) { setMsg('❌ ' + d.error); setPlacing(false); return; }
        serviceId = d.service.id;
      }
      const res = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ serviceId, link: order.link, quantity: parseInt(order.qty) }) });
      const d = await res.json();
      if (res.ok) { setMsg('✅ ' + (locale === 'ar' ? 'تم إرسال الطلب!' : 'Order placed!')); await refresh(); setTimeout(() => { setOrder(null); navigate('/dashboard/orders'); }, 1500); }
      else setMsg('❌ ' + d.error);
    } finally { setPlacing(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/dashboard/services')} className="text-gray-500 hover:text-white transition-colors text-2xl">{locale === 'ar' ? '→' : '←'}</button>
        {section && (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ backgroundColor: section.color + '20' }}>{section.icon}</div>
            <div>
              <h1 className="text-2xl font-bold text-white">{locale === 'ar' ? section.nameAr : section.name}</h1>
              {(section.descriptionAr || section.description) && <p className="text-gray-500 text-sm">{locale === 'ar' ? section.descriptionAr : section.description}</p>}
            </div>
          </div>
        )}
      </div>
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t.search} className="input-field max-w-sm" />
      {filtered.length === 0 ? <div className="card text-center py-12"><p className="text-gray-500">{t.noServices}</p></div> :
        <div className="grid gap-3">
          {filtered.map((s, i) => (
            <div key={s.id || i} className="card hover:border-amber-500/30 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="text-xs bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded">{s.category}</span>
                    {s.refill && <span className="text-xs bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded">♻️ Refill</span>}
                  </div>
                  <h3 className="text-white font-semibold">{locale === 'ar' && s.nameAr ? s.nameAr : s.name}</h3>
                  <div className="flex gap-4 mt-2 text-xs text-gray-500">
                    <span>#{s.providerId}</span><span>{t.min}: {s.min?.toLocaleString()}</span><span>{t.max}: {s.max?.toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2">
                  <div className="text-end">
                    <p className="text-2xl font-black text-amber-500">${s.finalPricePerK?.toFixed(3)}</p>
                    <p className="text-xs text-gray-500">{t.perThousand}</p>
                  </div>
                  <button onClick={() => setOrder({ service: s, link: '', qty: String(s.min) })} className="btn-primary whitespace-nowrap text-sm">{t.orderNow}</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      }

      {order && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md">
            <h3 className="text-lg font-bold text-white mb-2">{t.newOrder}</h3>
            <p className="text-gray-400 text-sm mb-4 line-clamp-2">{order.service.name}</p>
            {msg && <div className="mb-3 text-sm bg-[#1a1a1a] px-4 py-3 rounded-lg text-amber-400">{msg}</div>}
            <div className="space-y-3">
              <div><label className="text-gray-400 text-sm block mb-1">{t.link}</label><input value={order.link} onChange={e => setOrder({ ...order, link: e.target.value })} placeholder="https://..." className="input-field" /></div>
              <div><label className="text-gray-400 text-sm block mb-1">{t.quantity} ({order.service.min?.toLocaleString()} - {order.service.max?.toLocaleString()})</label><input type="number" value={order.qty} onChange={e => setOrder({ ...order, qty: e.target.value })} min={order.service.min} max={order.service.max} className="input-field" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="card-sm"><p className="text-gray-500 text-xs">{locale === 'ar' ? 'التكلفة' : 'Cost'}</p><p className="text-amber-500 font-bold">${cost.toFixed(4)}</p></div>
                <div className="card-sm"><p className="text-gray-500 text-xs">{t.balance}</p><p className={`font-bold ${(user?.walletBalance || 0) >= cost ? 'text-green-400' : 'text-red-400'}`}>${user?.walletBalance.toFixed(2)}</p></div>
              </div>
              {(user?.walletBalance || 0) < cost && <p className="text-red-400 text-sm text-center">{t.insufficientBalance}</p>}
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => { setOrder(null); setMsg(''); }} className="btn-secondary flex-1">{t.cancel}</button>
              <button onClick={placeOrder} disabled={placing || !order.link || cost <= 0 || cost > (user?.walletBalance || 0)} className="btn-primary flex-1">{placing ? t.loading : t.confirm}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
