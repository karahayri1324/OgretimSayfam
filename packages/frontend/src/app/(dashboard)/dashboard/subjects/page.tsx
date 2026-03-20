'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Plus, BookOpen, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [form, setForm] = useState({ name: '', code: '', color: '#3b82f6' });

  const fetchSubjects = async () => {
    try {
      const { data } = await api.get('/subjects');
      setSubjects(data.data || []);
    } catch {
      toast.error('Dersler yüklenemedi');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchSubjects(); }, []);

  const openCreateModal = () => {
    setEditingSubject(null);
    setForm({ name: '', code: '', color: '#3b82f6' });
    setShowModal(true);
  };

  const openEditModal = (subject: any) => {
    setEditingSubject(subject);
    setForm({ name: subject.name, code: subject.code || '', color: subject.color || '#3b82f6' });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingSubject(null);
    setForm({ name: '', code: '', color: '#3b82f6' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSubject) {
        await api.put(`/subjects/${editingSubject.id}`, form);
        toast.success('Ders güncellendi');
      } else {
        await api.post('/subjects', form);
        toast.success('Ders oluşturuldu');
      }
      closeModal();
      fetchSubjects();
    } catch (err: any) {
      toast.error(err.response?.data?.message?.[0] || 'Hata');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/subjects/${deleteTarget.id}`);
      toast.success('Ders silindi');
      setDeleteTarget(null);
      fetchSubjects();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Silme işlemi başarısız');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dersler</h1>
        <button onClick={openCreateModal} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Yeni Ders
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
        </div>
      )}

      {!loading && <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {subjects.map((s: any) => (
          <div key={s.id} className="card flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: (s.color || '#3b82f6') + '20' }}>
              <BookOpen className="w-5 h-5" style={{ color: s.color || '#3b82f6' }} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-gray-900">{s.name}</h3>
              <p className="text-xs text-gray-500">{s.code || '-'} • {s._count?.teacherAssignments || 0} atama</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => openEditModal(s)}
                className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                title="Düzenle"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => setDeleteTarget(s)}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Sil"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>}

      {!loading && subjects.length === 0 && (
        <div className="card text-center py-12">
          <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-400 text-sm">Henüz ders tanımlanmamış</p>
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">{editingSubject ? 'Dersi Düzenle' : 'Yeni Ders'}</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input className="input" placeholder="Ders Adı" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <input className="input" placeholder="Kod (ör: MAT)" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
              <div>
                <label className="text-sm text-gray-600">Renk</label>
                <input type="color" className="w-full h-10 rounded-lg cursor-pointer" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={closeModal} className="btn-secondary flex-1">İptal</button>
                <button type="submit" className="btn-primary flex-1">{editingSubject ? 'Güncelle' : 'Oluştur'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Dersi Sil</h2>
            <p className="text-sm text-gray-600 mb-6">
              <span className="font-medium">{deleteTarget.name}</span> dersini silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteTarget(null)} className="btn-secondary flex-1">İptal</button>
              <button onClick={handleDelete} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors text-sm font-medium">Sil</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
