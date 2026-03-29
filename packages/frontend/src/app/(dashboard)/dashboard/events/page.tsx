'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { Plus, CalendarDays, MapPin, Loader2, Pencil, Trash2, Clock, Users } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

const typeLabels: Record<string, string> = {
  TRIP: 'Gezi', CEREMONY: 'Toren', MEETING: 'Toplanti',
  SPORTS: 'Sportif', CULTURAL: 'Kulturel', OTHER: 'Diger',
};

interface ClassOption {
  id: string;
  name: string;
}

const emptyForm = {
  title: '',
  description: '',
  type: 'OTHER',
  startDate: '',
  endDate: '',
  location: '',
  startTime: '',
  endTime: '',
  targetClassIds: [] as string[],
};

export default function EventsPage() {
  const { user } = useAuthStore();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [classes, setClasses] = useState<ClassOption[]>([]);

  const canManage = ['SCHOOL_ADMIN', 'TEACHER'].includes(user?.role || '');

  const loadEvents = async () => {
    try {
      const { data } = await api.get('/events');
      setEvents(data.data || []);
    } catch {
      toast.error('Etkinlikler yuklenemedi');
    }
  };

  useEffect(() => {
    loadEvents().finally(() => setLoading(false));
    api.get('/classes').then(({ data }) => setClasses(data.data || [])).catch(() => {  });
  }, []);

  const openCreateModal = () => {
    setEditingEvent(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEditModal = (event: any) => {
    setEditingEvent(event);
    setForm({
      title: event.title || '',
      description: event.description || '',
      type: event.type || 'OTHER',
      startDate: event.startDate ? new Date(event.startDate).toISOString().slice(0, 16) : '',
      endDate: event.endDate ? new Date(event.endDate).toISOString().slice(0, 16) : '',
      location: event.location || '',
      startTime: event.startTime || '',
      endTime: event.endTime || '',
      targetClassIds: event.targetClasses?.map((tc: any) => tc.class?.id || tc.classId) || [],
    });
    setShowModal(true);
  };

  const toggleClass = (id: string) => {
    setForm((prev) => ({
      ...prev,
      targetClassIds: prev.targetClassIds.includes(id)
        ? prev.targetClassIds.filter((c) => c !== id)
        : [...prev.targetClassIds, id],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        title: form.title,
        description: form.description || undefined,
        type: form.type,
        startDate: form.startDate,
        endDate: form.endDate || undefined,
        location: form.location || undefined,
        startTime: form.startTime || undefined,
        endTime: form.endTime || undefined,
        targetClassIds: form.targetClassIds.length > 0 ? form.targetClassIds : undefined,
      };
      if (editingEvent) {
        await api.put(`/events/${editingEvent.id}`, payload);
        toast.success('Etkinlik guncellendi');
      } else {
        await api.post('/events', payload);
        toast.success('Etkinlik olusturuldu');
      }
      setShowModal(false);
      setEditingEvent(null);
      await loadEvents();
    } catch (err: any) {
      toast.error(err.response?.data?.message?.[0] || 'Hata olustu');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/events/${id}`);
      toast.success('Etkinlik silindi');
      setDeleteConfirm(null);
      await loadEvents();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Silme basarisiz');
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
        {canManage && (
          <button onClick={openCreateModal} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> Yeni Etkinlik
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {events.map((e: any) => (
          <div key={e.id} className="card">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-gray-900">{e.title}</h3>
              <div className="flex items-center gap-2">
                <span className="badge badge-blue">{typeLabels[e.type] || e.type}</span>
                {canManage && (
                  <>
                    <button
                      onClick={() => openEditModal(e)}
                      className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                      title="Duzenle"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(e.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Sil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
            {e.description && <p className="text-sm text-gray-600 mb-2">{e.description}</p>}
            <div className="flex items-center gap-4 text-xs text-gray-400 flex-wrap">
              <div className="flex items-center gap-1">
                <CalendarDays className="w-3 h-3" /> {formatDate(e.startDate)}
              </div>
              {e.endDate && (
                <div className="flex items-center gap-1">
                  <CalendarDays className="w-3 h-3" /> {formatDate(e.endDate)}
                </div>
              )}
              {(e.startTime || e.endTime) && (
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {e.startTime && e.endTime
                    ? `${e.startTime} - ${e.endTime}`
                    : e.startTime || e.endTime}
                </div>
              )}
              {e.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {e.location}
                </div>
              )}
              {e.targetClasses && e.targetClasses.length > 0 && (
                <div className="flex items-center gap-1 text-primary-500">
                  <Users className="w-3 h-3" />
                  {e.targetClasses.map((tc: any) => tc.class?.name).filter(Boolean).join(', ')}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {events.length === 0 && (
        <div className="card text-center py-12">
          <CalendarDays className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-400 text-sm">Henuz etkinlik yok</p>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => { setShowModal(false); setEditingEvent(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4">
              {editingEvent ? 'Etkinligi Duzenle' : 'Yeni Etkinlik'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input className="input" placeholder="Baslik" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              <textarea className="input min-h-[80px]" placeholder="Aciklama" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Baslangic Tarihi *</label>
                <input type="datetime-local" className="input" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required />
              </div>
              <div>
                <label className="text-sm text-gray-600 block mb-1">Bitis Tarihi</label>
                <input type="datetime-local" className="input" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-600 block mb-1">Baslangic Saati</label>
                  <input type="time" className="input" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm text-gray-600 block mb-1">Bitis Saati</label>
                  <input type="time" className="input" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
                </div>
              </div>

              <input className="input" placeholder="Konum" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />

              {classes.length > 0 && (
                <div>
                  <label className="text-sm text-gray-600 block mb-2">
                    Hedef Siniflar <span className="text-gray-400 font-normal">(bos = herkese)</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {classes.map((cls) => {
                      const isSelected = form.targetClassIds.includes(cls.id);
                      return (
                        <button
                          key={cls.id}
                          type="button"
                          onClick={() => toggleClass(cls.id)}
                          className={`
                            px-3 py-1.5 rounded-lg text-sm font-medium border transition-all
                            ${isSelected ? 'bg-primary-50 text-primary-700 border-primary-300' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}
                          `}
                        >
                          {cls.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => { setShowModal(false); setEditingEvent(null); }} className="btn-secondary flex-1">Iptal</button>
                <button type="submit" className="btn-primary flex-1">
                  {editingEvent ? 'Guncelle' : 'Olustur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Etkinligi Sil</h2>
            <p className="text-sm text-gray-600 mb-6">
              Bu etkinligi silmek istediginizden emin misiniz? Bu islem geri alinamaz.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteConfirm(null)} className="btn-secondary flex-1">Iptal</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors">
                Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
