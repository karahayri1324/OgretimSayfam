'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { Plus, CalendarDays, MapPin, Loader2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

const typeLabels: Record<string, string> = {
  TRIP: 'Gezi', CEREMONY: 'Tören', MEETING: 'Toplantı',
  SPORTS: 'Sportif', CULTURAL: 'Kültürel', OTHER: 'Diğer',
};

export default function EventsPage() {
  const { user } = useAuthStore();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', type: 'OTHER', startDate: '', location: '' });

  const canCreate = ['SCHOOL_ADMIN', 'TEACHER'].includes(user?.role || '');

  useEffect(() => {
    api.get('/events')
      .then(({ data }) => setEvents(data.data || []))
      .catch(() => toast.error('Etkinlikler yüklenemedi'))
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/events', form);
      toast.success('Etkinlik oluşturuldu');
      setShowModal(false);
      const { data } = await api.get('/events');
      setEvents(data.data);
    } catch (err: any) {
      toast.error(err.response?.data?.message?.[0] || 'Hata');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Etkinlikler</h1>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Etkinlikler</h1>
        {canCreate && (
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Yeni Etkinlik
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {events.map((e: any) => (
          <div key={e.id} className="card">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-gray-900">{e.title}</h3>
              <span className="badge badge-blue">{typeLabels[e.type] || e.type}</span>
            </div>
            {e.description && <p className="text-sm text-gray-600 mb-2">{e.description}</p>}
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <div className="flex items-center gap-1">
                <CalendarDays className="w-3 h-3" /> {formatDate(e.startDate)}
              </div>
              {e.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {e.location}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {events.length === 0 && (
        <div className="card text-center py-12">
          <CalendarDays className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-400 text-sm">Henüz etkinlik yok</p>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">Yeni Etkinlik</h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <input className="input" placeholder="Başlık" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              <textarea className="input min-h-[80px]" placeholder="Açıklama" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <input type="datetime-local" className="input" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required />
              <input className="input" placeholder="Konum" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">İptal</button>
                <button type="submit" className="btn-primary flex-1">Oluştur</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
