import { useEffect, useState } from 'react';
import { useLang, useAuth } from '../../lib/context';

export default function WalletPage() {
  const { t, locale } = useLang();
  const { user } = useAuth();
  const [methods, setMethods] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [form, setForm] = useState({ amount: '', transactionRef: '', note: '' });
  const [requests, setRequests] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');

  const loadData = () => {
    fetch('/api/wallet/methods', { credentials: 'include' }).then(r => r.json()).then(d => setMethods(d.methods || []));
    fetch('/api/wallet/topups', { credentials: 'include' }).then(r => r.json()).then(d => setRequests(d.requests || []));
  };

  useEffect(loadData, []);

  const submit = async () => {
    if (!selected) return;
    setSubmitting(true); setMsg('');
    const res = await fetch('/api/wallet/topup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ paymentMethodId: selected.id, ...form, amount: parseFloat(form.amount) }) });
    const d = await res.json();
    if (res.ok) { setMsg('✅ ' + (locale === 'ar' ? 'تم إرسال الطلب، في انتظار الموافقة' : 'Request sent, awaiting approval')); setForm({ amount: '', transactionRef: '', note: '' }); setSelected(null); loadData(); }
    else setMsg('❌ ' + d.error);
    setSubmitting(false);
  };

  const statusBadge = (s: string) => ({ PENDING: <span className="badge-pending">{t.pending}</span>, APPROVED: <span className="badge-completed">{t.approved}</span>, REJECTED: <span className="badge-failed">{t.rejected}</span> }[s] || <span>{s}</span>);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">{t.wallet}</h1>
      <div className="card bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
        <p className="text-gray-400 text-sm mb-1">{t.balance}</p>
        <p className="text-4xl font-black text-amber-500">${user?.walletBalance.toFixed(2)}</p>
      </div>
      <div className="card">
        <h2 className="text-lg font-bold text-white mb-4">{t.walletTopup}</h2>
        {msg && <div className="mb-4 text-sm text-amber-400 bg-amber-500/10 px-4 py-3 rounded-lg">{msg}</div>}
        {!selected ? (
          <div className="grid sm:grid-cols-2 gap-3">
            {methods.map(m => (
              <button key={m.id} onClick={() => setSelected(m)} className="card-sm hover:border-amber-500/50 transition-colors text-start">
                <p className="font-semibold text-white">{locale === 'ar' ? m.nameAr : m.name}</p>
                <p className="text-xs text-gray-500 mt-1">{m.currency} — {locale === 'ar' ? `الحد الأدنى: $${m.minAmount}` : `Min: $${m.minAmount}`}</p>
                <p className="text-xs text-amber-500 mt-2 font-mono">{m.accountInfo}</p>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="card-sm bg-amber-500/5 border-amber-500/20">
              <p className="text-amber-500 font-semibold">{locale === 'ar' ? selected.nameAr : selected.name}</p>
              <p className="text-white font-mono mt-1">{selected.accountInfo}</p>
              {selected.instructionsAr && <p className="text-gray-400 text-sm mt-2">{locale === 'ar' ? selected.instructionsAr : selected.instructions}</p>}
            </div>
            <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder={`${t.amount} ($${selected.minAmount} - $${selected.maxAmount})`} className="input-field" />
            <input value={form.transactionRef} onChange={e => setForm({ ...form, transactionRef: e.target.value })} placeholder={t.transactionRef} className="input-field" />
            <textarea value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder={t.note} className="input-field h-20 resize-none" />
            <div className="flex gap-3">
              <button onClick={() => setSelected(null)} className="btn-secondary flex-1">{t.cancel}</button>
              <button onClick={submit} disabled={submitting || !form.amount || !form.transactionRef} className="btn-primary flex-1">{submitting ? t.loading : t.confirm}</button>
            </div>
          </div>
        )}
      </div>
      <div className="card">
        <h2 className="text-lg font-bold text-white mb-4">{t.history}</h2>
        {requests.length === 0 ? <p className="text-gray-500 text-center py-6">{t.noData}</p> :
          <div className="space-y-2">
            {requests.map(r => (
              <div key={r.id} className="card-sm flex justify-between items-center">
                <div><p className="text-white font-medium">${r.amount}</p><p className="text-xs text-gray-500">{r.transactionRef} • {new Date(r.createdAt).toLocaleDateString()}</p></div>
                <div className="text-end">{statusBadge(r.status)}{r.creditedAmount && <p className="text-xs text-green-400 mt-1">+${r.creditedAmount}</p>}</div>
              </div>
            ))}
          </div>
        }
      </div>
    </div>
  );
}
