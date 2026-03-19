'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { Plus, Users, School } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ClassesPage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', grade: 9, section: 'A', capacity: 30 });

  const fetchClasses = async () => {
    try {
      const { data } = await api.get('/classes');
      setClasses(data.data || []);
    } catch {
      toast.error('Sınıflar yüklenemedi');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchClasses(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/classes', form);
      toast.success('Sınıf oluşturuldu');
      setShowModal(false);
      fetchClasses();
    } catch (err: any) {
      toast.error(err.response?.data?.message?.[0] || 'Hata oluştu');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Sınıflar</h1>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Yeni Sınıf
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
        </div>
      )}

      {!loading && <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {classes.map((cls: any) => (
          <div key={cls.id} className="card hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-gray-900">{cls.name}</h3>
              <span className="badge badge-blue">{cls.grade}. Sınıf</span>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span>{cls._count?.students || 0} Öğrenci</span>
              </div>
              <span>Kapasite: {cls.capacity}</span>
            </div>
          </div>
        ))}
      </div>}

      {!loading && classes.length === 0 && (
        <div className="card text-center py-12">
          <School className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-400 text-sm">Henüz sınıf oluşturulmamış</p>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">Yeni Sınıf</h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <input className="input" placeholder="Sınıf Adı (ör: 9-A)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-600">Seviye</label>
                  <select className="input" value={form.grade} onChange={(e) => setForm({ ...form, grade: parseInt(e.target.value) })}>
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-gray-600">Şube</label>
                  <input className="input" placeholder="A" value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} required />
                </div>
              </div>
              <input className="input" type="number" placeholder="Kapasite" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: parseInt(e.target.value) })} />
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
