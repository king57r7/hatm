import { useEffect, useState } from 'react';
import { useLang } from '../../lib/context';

export default function AdminUsersPage() {
  const { t, locale } = useLang();
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any>(null);
  const [editData, setEditData] = useState({ walletBalance: '', password: '' });
  const [msg, setMsg] = useState('');

  const load = () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (search) p.set('search', search);
    fetch(`/api/admin/users?${p}`, { credentials: 'include' }).then(r => r.json()).then(d => setUsers(d.users || [])).finally(() => setLoading(false));
  };

  useEffect(load, [search]);

  const update = async (id: string, data: Record<string, unknown>) => {
    const res = await fetch(`/api/admin/users/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(data) });
    const d = await res.json();
    if (res.ok) { setMsg('✅ ' + t.success); load(); setEditing(null); } else setMsg('❌ ' + d.error);
  };

  const del = async (id: string) => {
    if (!confirm(locale === 'ar' ? 'هل أنت متأكد؟' : 'Are you sure?')) return;
    await fetch(`/api/admin/users/${id}`, { method: 'DELETE', credentials: 'include' }); load();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">{t.users}</h1>
      {msg && <div className="card-sm text-sm text-amber-400">{msg}</div>}
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t.search} className="input-field max-w-sm" />
      {loading ? <div className="text-center py-12 text-gray-500">{t.loading}</div> :
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#0d0d0d]"><tr>{[t.username, t.email, t.balance, t.totalSpent, t.status, t.date, t.actions].map(h => <th key={h} className="table-header">{h}</th>)}</tr></thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="table-row">
                    <td className="table-cell text-white font-medium">{u.username}</td>
                    <td className="table-cell text-gray-400">{u.email}</td>
                    <td className="table-cell text-amber-500">${u.walletBalance.toFixed(2)}</td>
                    <td className="table-cell text-gray-400">${u.totalSpent.toFixed(2)}</td>
                    <td className="table-cell"><span className={u.isBlocked ? 'badge-failed' : 'badge-completed'}>{u.isBlocked ? (locale === 'ar' ? 'محظور' : 'Blocked') : (locale === 'ar' ? 'نشط' : 'Active')}</span></td>
                    <td className="table-cell text-gray-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="table-cell">
                      <div className="flex gap-2 flex-wrap">
                        <button onClick={() => { setEditing(u); setEditData({ walletBalance: u.walletBalance, password: '' }); }} className="btn-secondary text-xs px-2 py-1">{t.edit}</button>
                        <button onClick={() => update(u.id, { isBlocked: !u.isBlocked })} className={`text-xs px-2 py-1 rounded-lg ${u.isBlocked ? 'btn-success' : 'btn-danger'}`}>{u.isBlocked ? t.unblock : t.block}</button>
                        <button onClick={() => del(u.id)} className="btn-danger text-xs px-2 py-1">{t.delete}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      }
      {editing && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md">
            <h3 className="text-lg font-bold text-white mb-4">{t.edit}: {editing.username}</h3>
            <div className="space-y-3">
              <div><label className="text-gray-400 text-sm block mb-1">{t.balance}</label><input type="number" value={editData.walletBalance} onChange={e => setEditData({ ...editData, walletBalance: e.target.value })} className="input-field" /></div>
              <div><label className="text-gray-400 text-sm block mb-1">{t.password} ({locale === 'ar' ? 'اتركه فارغاً للإبقاء' : 'Leave empty to keep'})</label><input type="password" value={editData.password} onChange={e => setEditData({ ...editData, password: e.target.value })} className="input-field" /></div>
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setEditing(null)} className="btn-secondary flex-1">{t.cancel}</button>
              <button onClick={() => update(editing.id, { walletBalance: editData.walletBalance, ...(editData.password && { password: editData.password }) })} className="btn-primary flex-1">{t.save}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
