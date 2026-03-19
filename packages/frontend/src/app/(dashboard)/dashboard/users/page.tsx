'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { roleLabels } from '@/lib/utils';
import { Plus, UserCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    email: '', password: '123456', firstName: '', lastName: '', phone: '', role: 'TEACHER',
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = filterRole ? `?role=${filterRole}` : '';
      const { data } = await api.get(`/users${params}`);
      setUsers(data.data || []);
    } catch { toast.error('Kullanıcılar yüklenemedi'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, [filterRole]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/users', form);
      toast.success('Kullanıcı oluşturuldu');
      setShowModal(false);
      setForm({ email: '', password: '123456', firstName: '', lastName: '', phone: '', role: 'TEACHER' });
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.message?.[0] || 'Hata oluştu');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Kullanıcılar</h1>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Yeni Kullanıcı
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {['', 'TEACHER', 'STUDENT', 'PARENT', 'SCHOOL_ADMIN'].map((role) => (
          <button
            key={role}
            onClick={() => setFilterRole(role)}
            className={`px-3 py-1.5 rounded-lg text-sm ${filterRole === role ? 'bg-primary-100 text-primary-700 font-medium' : 'bg-white text-gray-600 border border-gray-200'}`}
          >
            {role ? roleLabels[role] : 'Tümü'}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden !p-0">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left text-xs font-medium text-gray-500 px-6 py-3">Kullanıcı</th>
              <th className="text-left text-xs font-medium text-gray-500 px-6 py-3">E-posta</th>
              <th className="text-left text-xs font-medium text-gray-500 px-6 py-3">Rol</th>
              <th className="text-left text-xs font-medium text-gray-500 px-6 py-3">Durum</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.map((u: any) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-6 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium text-primary-700">{u.firstName?.[0]}{u.lastName?.[0]}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{u.firstName} {u.lastName}</span>
                  </div>
                </td>
                <td className="px-6 py-3 text-sm text-gray-600">{u.email}</td>
                <td className="px-6 py-3"><span className="badge badge-blue">{roleLabels[u.role]}</span></td>
                <td className="px-6 py-3">
                  <span className={`badge ${u.isActive ? 'badge-green' : 'badge-red'}`}>
                    {u.isActive ? 'Aktif' : 'Pasif'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && (
          <div className="p-8 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
          </div>
        )}
        {!loading && users.length === 0 && (
          <div className="p-12 text-center">
            <UserCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-400 text-sm">Kullanıcı bulunamadı</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">Yeni Kullanıcı</h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input className="input" placeholder="Ad" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} required />
                <input className="input" placeholder="Soyad" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} required />
              </div>
              <input className="input" type="email" placeholder="E-posta" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              <input className="input" placeholder="Şifre" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
              <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="TEACHER">Öğretmen</option>
                <option value="STUDENT">Öğrenci</option>
                <option value="PARENT">Veli</option>
                <option value="SCHOOL_ADMIN">Okul Yöneticisi</option>
              </select>
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
