import { useEffect, useState } from 'react';
import { useLang } from '../../lib/context';

export default function AdminTopupsPage() {
  const { t, locale } = useLang();
  const [requests, setRequests] = useState<any[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<string | null>(null);
  const [creditAmt, setCreditAmt] = useState('');
  const [msg, setMsg] = useState('');

  const load = () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (filter) p.set('status', filter);
    fetch(`/api/admin/topups?${p}`, { credentials: 'include' }).then(r => r.json()).then(d => setRequests(d.requests || [])).finally(() => setLoading(false));
  };

  useEffect(load, [filter]);

  const action = async (id: string, act: string, amt?: string) => {
    const res = await fetch(`/api/admin/topups/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ action: act, creditedAmount: amt }) });
    const d = await res.json();
    if (res.ok) { setMsg('✅ ' + t.success); setApproving(null); load(); } else setMsg('❌ ' + d.error);
  };

  const statusBadge = (s: string) => ({ PENDING: <span className="badge-pending">{t.pending}</span>, APPROVED: <span className="badge-completed">{t.approved}</span>, REJECTED: <span className="badge-failed">{t.rejected}</span> }[s] || <span>{s}</span>);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">{t.topups}</h1>
      {msg && <div className="card-sm text-sm text-amber-400">{msg}</div>}
      <div className="flex gap-2">
        {['', 'PENDING', 'APPROVED', 'REJECTED'].map(s => (
          <button key={s} onClick={() => setFilter(s)} className={`px-3 py-1 rounded-lg text-sm transition-colors ${filter === s ? 'bg-amber-500 text-black font-bold' : 'btn-secondary'}`}>
            {s === '' ? (locale === 'ar' ? 'الكل' : 'All') : s === 'PENDING' ? t.pending : s === 'APPROVED' ? t.approved : t.rejected}
          </button>
        ))}
      </div>
      {loading ? <div className="text-center py-12 text-gray-500">{t.loading}</div> :
        <div className="space-y-3">
          {requests.map(r => (
            <div key={r.id} className="card">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1"><span className="text-white font-bold">{r.user?.username}</span>{statusBadge(r.status)}</div>
                  <p className="text-gray-400 text-sm">{r.user?.email}</p>
                  <div className="flex gap-4 mt-2 text-sm"><span className="text-amber-500 font-bold">${r.amount}</span><span className="text-gray-400">{r.paymentMethod?.name}</span><span className="text-gray-500 font-mono">{r.transactionRef}</span></div>
                  {r.note && <p className="text-gray-500 text-xs mt-1">{r.note}</p>}
                  {r.creditedAmount && <p className="text-green-400 text-sm mt-1">{locale === 'ar' ? 'مُضاف:' : 'Credited:'} ${r.creditedAmount}</p>}
                  <p className="text-gray-600 text-xs mt-1">{new Date(r.createdAt).toLocaleString()}</p>
                </div>
                {r.status === 'PENDING' && (
                  <div className="flex flex-col gap-2">
                    {approving === r.id ? (
                      <div className="space-y-2">
                        <input type="number" value={creditAmt} onChange={e => setCreditAmt(e.target.value)} placeholder={`${t.creditAmount} ($${r.amount})`} className="input-field text-sm py-2" />
                        <div className="flex gap-2">
                          <button onClick={() => setApproving(null)} className="btn-secondary flex-1 text-sm">{t.cancel}</button>
                          <button onClick={() => action(r.id, 'approve', creditAmt || r.amount)} className="btn-success flex-1 text-sm">{t.confirm}</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button onClick={() => { setApproving(r.id); setCreditAmt(r.amount); }} className="btn-success text-sm">{t.approve}</button>
                        <button onClick={() => action(r.id, 'reject')} className="btn-danger text-sm">{t.reject}</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          {requests.length === 0 && <p className="text-center text-gray-500 py-8">{t.noData}</p>}
        </div>
      }
    </div>
  );
}
