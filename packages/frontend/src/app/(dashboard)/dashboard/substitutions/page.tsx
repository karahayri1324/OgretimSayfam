'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import { UserCheck, ChevronLeft, ChevronRight, Loader2, Plus, AlertCircle, Users } from 'lucide-react';

export default function SubstitutionsPage() {
  const { user } = useAuthStore();
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [substitutions, setSubstitutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'SCHOOL_ADMIN';

  const loadSubstitutions = useCallback(async () => {
    try {
      const { data } = await api.get(`/substitutions?date=${selectedDate}`);
      setSubstitutions(data.data || []);
    } catch {
      toast.error('Vekil atamaları yüklenemedi');
    } finally { setLoading(false); }
  }, [selectedDate]);

  useEffect(() => { loadSubstitutions(); }, [loadSubstitutions]);

  const changeDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu vekil atamasını silmek istediğinize emin misiniz?')) return;
    try {
      await api.delete(`/substitutions/${id}`);
      toast.success('Vekil ataması silindi');
      loadSubstitutions();
    } catch {
      toast.error('Silme başarısız');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-primary-600 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Vekil Öğretmen Yönetimi</h1>
        {isAdmin && (
          <button onClick={() => setShowAddModal(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Vekil Ata
          </button>
        )}
      </div>

      {/* Date Controls */}
      <div className="flex items-center gap-2">
        <button onClick={() => changeDate(-1)} className="p-2 rounded-lg hover:bg-gray-100">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <input type="date" className="input" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
        <button onClick={() => changeDate(1)} className="p-2 rounded-lg hover:bg-gray-100">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Substitutions List */}
      {substitutions.length === 0 ? (
        <div className="card text-center py-12">
          <UserCheck className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-400 text-sm">Bu tarihte vekil ataması yok</p>
        </div>
      ) : (
        <div className="card !p-0 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-4 py-3 text-xs font-medium text-gray-500">Ders Saati</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">Sınıf</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">Ders</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">Asıl Öğretmen</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">Vekil Öğretmen</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500">Sebep</th>
                {isAdmin && <th className="px-4 py-3 text-xs font-medium text-gray-500 w-20">İşlem</th>}
              </tr>
            </thead>
            <tbody>
              {substitutions.map((sub: any) => (
                <tr key={sub.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">{sub.timetableEntry?.timeSlot?.slotNumber}. Ders</td>
                  <td className="px-4 py-3 text-sm">{sub.timetableEntry?.class?.name}</td>
                  <td className="px-4 py-3 text-sm">{sub.timetableEntry?.subject?.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {sub.originalTeacher?.user?.firstName} {sub.originalTeacher?.user?.lastName}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-primary-700">
                    {sub.substituteTeacher?.user?.firstName} {sub.substituteTeacher?.user?.lastName}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{sub.reason || '-'}</td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <button onClick={() => handleDelete(sub.id)} className="text-red-500 hover:text-red-700 text-xs">
                        Sil
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <AddSubstitutionModal
          date={selectedDate}
          onClose={() => setShowAddModal(false)}
          onSaved={() => { setShowAddModal(false); loadSubstitutions(); }}
        />
      )}
    </div>
  );
}

function AddSubstitutionModal({ date, onClose, onSaved }: {
  date: string; onClose: () => void; onSaved: () => void;
}) {
  const [timeSlots, setTimeSlots] = useState<any[]>([]);
  const [selectedTimeSlotId, setSelectedTimeSlotId] = useState('');
  const [availableTeachers, setAvailableTeachers] = useState<any[]>([]);
  const [timetableEntries, setTimetableEntries] = useState<any[]>([]);
  const [selectedEntryId, setSelectedEntryId] = useState('');
  const [selectedSubTeacherId, setSelectedSubTeacherId] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');

  useEffect(() => {
    const init = async () => {
      const [tsRes, clsRes] = await Promise.all([
        api.get('/timetable/time-slots'),
        api.get('/classes'),
      ]);
      setTimeSlots(tsRes.data.data || []);
      setClasses(clsRes.data.data || []);
    };
    init();
  }, []);

  useEffect(() => {
    if (!selectedClassId) return;
    api.get(`/timetable/class/${selectedClassId}`).then(({ data }) => {
      const dayOfWeek = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'][new Date(date).getDay()];
      setTimetableEntries((data.data || []).filter((e: any) => e.dayOfWeek === dayOfWeek));
    });
  }, [selectedClassId, date]);

  useEffect(() => {
    if (!selectedEntryId) return;
    const entry = timetableEntries.find((e: any) => e.id === selectedEntryId);
    if (entry?.timeSlotId) {
      api.get(`/substitutions/available-teachers?date=${date}&timeSlotId=${entry.timeSlotId}`)
        .then(({ data }) => setAvailableTeachers(data.data || []))
        .catch(() => {});
    }
  }, [selectedEntryId, date, timetableEntries]);

  const handleSave = async () => {
    if (!selectedEntryId || !selectedSubTeacherId) {
      toast.error('Ders ve vekil öğretmen seçin');
      return;
    }
    setSaving(true);
    try {
      const entry = timetableEntries.find((e: any) => e.id === selectedEntryId);
      await api.post('/substitutions', {
        timetableEntryId: selectedEntryId,
        originalTeacherId: entry?.teacherId,
        substituteTeacherId: selectedSubTeacherId,
        date,
        reason: reason || undefined,
      });
      toast.success('Vekil ataması oluşturuldu');
      onSaved();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Atama oluşturulamadı');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Vekil Öğretmen Ata</h3>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Sınıf</label>
            <select className="input w-full" value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)}>
              <option value="">Sınıf seçin...</option>
              {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Ders</label>
            <select className="input w-full" value={selectedEntryId} onChange={e => setSelectedEntryId(e.target.value)}>
              <option value="">Ders seçin...</option>
              {timetableEntries.map((e: any) => (
                <option key={e.id} value={e.id}>{e.timeSlot?.slotNumber}. Ders - {e.subject?.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Vekil Öğretmen</label>
            <select className="input w-full" value={selectedSubTeacherId} onChange={e => setSelectedSubTeacherId(e.target.value)}>
              <option value="">Müsait öğretmen seçin...</option>
              {availableTeachers.map((t: any) => (
                <option key={t.id} value={t.id}>{t.user?.firstName} {t.user?.lastName}</option>
              ))}
            </select>
            {selectedEntryId && availableTeachers.length === 0 && (
              <p className="text-xs text-yellow-600 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Bu saatte müsait öğretmen bulunamadı
              </p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Sebep</label>
            <input className="input w-full" value={reason} onChange={e => setReason(e.target.value)} placeholder="İzin, hastalık vb. (opsiyonel)" />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="btn-secondary">İptal</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? 'Kaydediliyor...' : 'Ata'}</button>
        </div>
      </div>
    </div>
  );
}
