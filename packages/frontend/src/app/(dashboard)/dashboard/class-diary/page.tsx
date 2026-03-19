'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import toast from 'react-hot-toast';
import { BookOpen, ChevronLeft, ChevronRight, CheckCircle, Loader2, Plus, FileText } from 'lucide-react';

export default function ClassDiaryPage() {
  const { user } = useAuthStore();
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'SCHOOL_ADMIN';
  const isTeacher = user?.role === 'TEACHER';

  useEffect(() => {
    const init = async () => {
      try {
        if (user?.role === 'STUDENT' && user.studentClassId) {
          setSelectedClassId(user.studentClassId);
        } else {
          const { data } = await api.get('/classes');
          setClasses(data.data || []);
          if (data.data?.length > 0) setSelectedClassId(data.data[0].id);
        }
      } catch {} finally { setLoading(false); }
    };
    if (user) init();
  }, [user]);

  const loadEntries = useCallback(async () => {
    if (!selectedClassId || !selectedDate) return;
    try {
      const { data } = await api.get(`/class-diary/class/${selectedClassId}?date=${selectedDate}`);
      setEntries(data.data || []);
    } catch {
      toast.error('Sınıf defteri kayıtları yüklenemedi');
    }
  }, [selectedClassId, selectedDate]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  const changeDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleApprove = async (id: string) => {
    try {
      await api.put(`/class-diary/${id}/approve`);
      toast.success('Onaylandı');
      loadEntries();
    } catch {
      toast.error('Onaylama başarısız');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-primary-600 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Sınıf Defteri</h1>
        {isTeacher && (
          <button onClick={() => setShowAddModal(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Kayıt Ekle
          </button>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 flex-wrap">
        {classes.length > 0 && (
          <select className="input w-48" value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)}>
            {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}

        <div className="flex items-center gap-2">
          <button onClick={() => changeDate(-1)} className="p-2 rounded-lg hover:bg-gray-100">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <input type="date" className="input" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
          <button onClick={() => changeDate(1)} className="p-2 rounded-lg hover:bg-gray-100">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Entries */}
      {entries.length === 0 ? (
        <div className="card text-center py-12">
          <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-400 text-sm">Bu tarihte sınıf defteri kaydı yok</p>
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry: any) => (
            <div key={entry.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm font-semibold text-primary-700">
                      {entry.timetableEntry?.timeSlot?.slotNumber}. Ders
                    </span>
                    <span className="text-sm font-medium text-gray-900">
                      {entry.timetableEntry?.subject?.name}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      entry.isApproved ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {entry.isApproved ? 'Onaylı' : 'Onay Bekliyor'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{entry.topic}</p>
                  {entry.description && <p className="text-xs text-gray-500 mt-1">{entry.description}</p>}
                  {entry.homework && (
                    <div className="mt-2 p-2 bg-blue-50 rounded-lg">
                      <p className="text-xs font-medium text-blue-700">Ödev: {entry.homework}</p>
                    </div>
                  )}
                </div>
                {isAdmin && !entry.isApproved && (
                  <button onClick={() => handleApprove(entry.id)} className="ml-4 p-2 text-green-600 hover:bg-green-50 rounded-lg" title="Onayla">
                    <CheckCircle className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <AddDiaryModal classId={selectedClassId} date={selectedDate} onClose={() => setShowAddModal(false)} onSaved={() => { setShowAddModal(false); loadEntries(); }} />
      )}
    </div>
  );
}

function AddDiaryModal({ classId, date, onClose, onSaved }: {
  classId: string; date: string; onClose: () => void; onSaved: () => void;
}) {
  const [timetableEntries, setTimetableEntries] = useState<any[]>([]);
  const [selectedEntryId, setSelectedEntryId] = useState('');
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  const [homework, setHomework] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get(`/timetable/class/${classId}`).then(({ data }) => {
      const dayOfWeek = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'][new Date(date).getDay()];
      const dayEntries = (data.data || []).filter((e: any) => e.dayOfWeek === dayOfWeek);
      setTimetableEntries(dayEntries);
      if (dayEntries.length > 0) setSelectedEntryId(dayEntries[0].id);
    });
  }, [classId, date]);

  const handleSave = async () => {
    if (!selectedEntryId || !topic) { toast.error('Ders ve konu gerekli'); return; }
    setSaving(true);
    try {
      await api.post('/class-diary', { timetableEntryId: selectedEntryId, classId, date, topic, description: description || undefined, homework: homework || undefined });
      toast.success('Kayıt eklendi');
      onSaved();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Kayıt eklenemedi');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Sınıf Defteri Kaydı Ekle</h3>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Ders</label>
            <select className="input w-full" value={selectedEntryId} onChange={e => setSelectedEntryId(e.target.value)}>
              {timetableEntries.length === 0 && <option value="">Bu gün ders yok</option>}
              {timetableEntries.map((e: any) => (
                <option key={e.id} value={e.id}>{e.timeSlot?.slotNumber}. Ders - {e.subject?.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">İşlenen Konu *</label>
            <input className="input w-full" value={topic} onChange={e => setTopic(e.target.value)} placeholder="Derste işlenen konu" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Açıklama</label>
            <textarea className="input w-full" rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="Ek açıklama (opsiyonel)" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Ödev</label>
            <input className="input w-full" value={homework} onChange={e => setHomework(e.target.value)} placeholder="Verilen ödev (opsiyonel)" />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="btn-secondary">İptal</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? 'Kaydediliyor...' : 'Kaydet'}</button>
        </div>
      </div>
    </div>
  );
}
