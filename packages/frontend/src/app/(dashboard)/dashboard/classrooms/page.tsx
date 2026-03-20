'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Plus, DoorOpen, Pencil, Trash2, Users } from 'lucide-react';
import toast from 'react-hot-toast';

const TYPES = ['NORMAL', 'LAB', 'GYM', 'CONFERENCE'] as const;
const TYPE_LABELS: Record<string, string> = {
  NORMAL: 'Normal',
  LAB: 'Laboratuvar',
  GYM: 'Spor Salonu',
  CONFERENCE: 'Konferans',
};
const TYPE_BADGE: Record<string, string> = {
  NORMAL: 'badge badge-blue',
  LAB: 'badge badge-purple',
  GYM: 'badge badge-green',
  CONFERENCE: 'badge badge-orange',
};

const defaultForm = { name: '', capacity: 30, type: 'NORMAL' };

export default function ClassroomsPage() {
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingClassroom, setEditingClassroom] = useState<any>(null);
  const [form, setForm] = useState(defaultForm);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleting, setDeleting] = useState(false);
  const [filterType, setFilterType] = useState<string>('');

  const fetchClassrooms = async () => {
    try {
      const params = filterType ? { type: filterType } : {};
      const { data } = await api.get('/classrooms', { params });
      setClassrooms(data.data || []);
    } catch {
      toast.error('Derslikler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClassrooms();
  }, [filterType]);

  const openCreateModal = () => {
    setEditingClassroom(null);
    setForm(defaultForm);
    setShowModal(true);
  };

  const openEditModal = (classroom: any) => {
    setEditingClassroom(classroom);
    setForm({
      name: classroom.name,
      capacity: classroom.capacity,
      type: classroom.type,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingClassroom(null);
    setForm(defaultForm);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingClassroom) {
        await api.put(`/classrooms/${editingClassroom.id}`, form);
        toast.success('Derslik guncellendi');
      } else {
        await api.post('/classrooms', form);
        toast.success('Derslik olusturuldu');
      }
      closeModal();
      fetchClassrooms();
    } catch (err: any) {
      toast.error(err.response?.data?.message?.[0] || 'Hata olustu');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/classrooms/${deleteTarget.id}`);
      toast.success('Derslik silindi');
      setDeleteTarget(null);
      fetchClassrooms();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Derslik silinemedi');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Derslikler</h1>
        <button onClick={openCreateModal} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Yeni Derslik
        </button>
      </div>

      {/* Type Filter */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setFilterType('')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            filterType === '' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Tumu
        </button>
        {TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filterType === t ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
        </div>
      )}

      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classrooms.map((classroom: any) => (
            <div key={classroom.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-gray-900">{classroom.name}</h3>
                <span className={TYPE_BADGE[classroom.type] || 'badge badge-blue'}>
                  {TYPE_LABELS[classroom.type] || classroom.type}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>Kapasite: {classroom.capacity}</span>
                </div>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    classroom.isActive
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {classroom.isActive ? 'Aktif' : 'Pasif'}
                </span>
              </div>
              <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                <button
                  onClick={() => openEditModal(classroom)}
                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 transition-colors px-2 py-1 rounded hover:bg-blue-50"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Duzenle
                </button>
                <button
                  onClick={() => setDeleteTarget(classroom)}
                  className="flex items-center gap-1 text-sm text-red-600 hover:text-red-800 transition-colors px-2 py-1 rounded hover:bg-red-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Sil
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && classrooms.length === 0 && (
        <div className="card text-center py-12">
          <DoorOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-400 text-sm">Henuz derslik olusturulmamis</p>
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">
              {editingClassroom ? 'Derslik Duzenle' : 'Yeni Derslik'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-sm text-gray-600">Derslik Adi</label>
                <input
                  className="input"
                  placeholder="Derslik 101"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-600">Tur</label>
                  <select
                    className="input"
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                  >
                    {TYPES.map((t) => (
                      <option key={t} value={t}>
                        {TYPE_LABELS[t]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Kapasite</label>
                  <input
                    className="input"
                    type="number"
                    min={1}
                    value={form.capacity}
                    onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value) || 1 })}
                    required
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={closeModal} className="btn-secondary flex-1">
                  Iptal
                </button>
                <button type="submit" className="btn-primary flex-1">
                  {editingClassroom ? 'Guncelle' : 'Olustur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Derslik Sil</h2>
            <p className="text-sm text-gray-600 mb-4">
              <span className="font-semibold">{deleteTarget.name}</span> dersligini silmek istediginize emin misiniz? Bu islem geri alinamaz.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="btn-secondary flex-1"
              >
                Iptal
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleting ? 'Siliniyor...' : 'Sil'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
