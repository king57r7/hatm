import { useEffect, useState } from 'react';
import { useLang } from '../../lib/context';

export default function AdminOrdersPage() {
  const { t, locale } = useLang();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/orders?admin=true', { credentials: 'include' }).then(r => r.json()).then(d => setOrders(d.orders || [])).finally(() => setLoading(false));
  }, []);

  const statusBadge = (s: string) => {
    const map: Record<string, [string, string]> = { PENDING: ['badge-pending', t.pending], IN_PROGRESS: ['badge-progress', t.inProgress], COMPLETED: ['badge-completed', t.completed], PARTIAL: ['badge-partial', t.partial], CANCELED: ['badge-canceled', t.canceled], FAILED: ['badge-failed', t.failed], REFUNDED: ['badge-refunded', t.refunded] };
    const [cls, label] = map[s] || ['badge-canceled', s];
    return <span className={cls}>{label}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">{t.orders}</h1>
        <span className="text-gray-500 text-sm">{orders.length} {locale === 'ar' ? 'طلب' : 'orders'}</span>
      </div>
      {loading ? <div className="text-center py-12 text-gray-500">{t.loading}</div> :
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#0d0d0d]"><tr>{[t.users, t.services, t.quantity, t.price, locale === 'ar' ? 'الربح' : 'Profit', t.status, t.date].map(h => <th key={h} className="table-header">{h}</th>)}</tr></thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id} className="table-row">
                    <td className="table-cell text-amber-500">{o.user?.username}</td>
                    <td className="table-cell text-white max-w-[180px] truncate">{o.service?.name}</td>
                    <td className="table-cell">{o.quantity.toLocaleString()}</td>
                    <td className="table-cell text-gray-300">${o.pricePaid?.toFixed(4)}</td>
                    <td className="table-cell text-green-400">${o.profit?.toFixed(4)}</td>
                    <td className="table-cell">{statusBadge(o.status)}</td>
                    <td className="table-cell text-gray-500">{new Date(o.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      }
    </div>
  );
}
