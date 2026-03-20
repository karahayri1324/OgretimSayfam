'use client';

import { useEffect, useState, useMemo } from 'react';
import api from '@/lib/api';
import { roleLabels } from '@/lib/utils';
import { Plus, UserCircle, Loader2, Pencil, Trash2, Search, X } from 'lucide-react';
import toast from 'react-hot-toast';

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    email: '', password: '123456', firstName: '', lastName: '', phone: '', role: 'TEACHER', studentNumber: '',
  });

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    firstName: '', lastName: '', phone: '', isActive: true,
  });

  // Delete confirmation
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingUser, setDeletingUser] = useState<any>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

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

  // Filtered users by search query
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase().trim();
    return users.filter((u) => {
      const fullName = `${u.firstName} ${u.lastName}`.toLowerCase();
      const email = (u.email || '').toLowerCase();
      const studentNum = (u.studentProfile?.studentNumber || '').toLowerCase();
      return fullName.includes(q) || email.includes(q) || studentNum.includes(q);
    });
  }, [users, searchQuery]);

  // Create
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/users', createForm);
      toast.success('Kullanıcı oluşturuldu');
      setShowCreateModal(false);
      setCreateForm({ email: '', password: '123456', firstName: '', lastName: '', phone: '', role: 'TEACHER', studentNumber: '' });
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.message?.[0] || 'Hata oluştu');
    }
  };

  // Edit
  const openEditModal = (user: any) => {
    setEditingUser(user);
    setEditForm({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      phone: user.phone || '',
      isActive: user.isActive ?? true,
    });
    setShowEditModal(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      await api.put(`/users/${editingUser.id}`, editForm);
      toast.success('Kullanıcı güncellendi');
      setShowEditModal(false);
      setEditingUser(null);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.message?.[0] || 'Güncelleme sırasında hata oluştu');
    }
  };

  // Delete
  const openDeleteDialog = (user: any) => {
    setDeletingUser(user);
    setShowDeleteDialog(true);
  };

  const handleDelete = async () => {
    if (!deletingUser) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/users/${deletingUser.id}`);
      toast.success('Kullanıcı silindi');
      setShowDeleteDialog(false);
      setDeletingUser(null);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.message?.[0] || 'Silme sırasında hata oluştu');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Kullanıcılar</h1>
        <button onClick={() => setShowCreateModal(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Yeni Kullanıcı
        </button>
      </div>

      {/* Search & Filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="İsim veya e-posta ile ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-10 pr-10 w-full max-w-md"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
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
              <th className="text-right text-xs font-medium text-gray-500 px-6 py-3">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredUsers.map((u: any) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-6 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium text-primary-700">{u.firstName?.[0]}{u.lastName?.[0]}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900">{u.firstName} {u.lastName}</span>
                    {u.studentProfile?.studentNumber && (
                      <span className="text-xs text-gray-400 font-mono bg-gray-100 px-1.5 py-0.5 rounded ml-2">{u.studentProfile.studentNumber}</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-3 text-sm text-gray-600">{u.email}</td>
                <td className="px-6 py-3"><span className="badge badge-blue">{roleLabels[u.role]}</span></td>
                <td className="px-6 py-3">
                  <span className={`badge ${u.isActive ? 'badge-green' : 'badge-red'}`}>
                    {u.isActive ? 'Aktif' : 'Pasif'}
                  </span>
                </td>
                <td className="px-6 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => openEditModal(u)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                      title="Düzenle"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openDeleteDialog(u)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      title="Sil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
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
        {!loading && filteredUsers.length === 0 && (
          <div className="p-12 text-center">
            <UserCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-400 text-sm">
              {searchQuery ? 'Aramanızla eşleşen kullanıcı bulunamadı' : 'Kullanıcı bulunamadı'}
            </p>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">Yeni Kullanıcı</h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input className="input" placeholder="Ad" value={createForm.firstName} onChange={(e) => setCreateForm({ ...createForm, firstName: e.target.value })} required />
                <input className="input" placeholder="Soyad" value={createForm.lastName} onChange={(e) => setCreateForm({ ...createForm, lastName: e.target.value })} required />
              </div>
              <input className="input" type="email" placeholder="E-posta" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} required />
              <input className="input" placeholder="Şifre" value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} required />
              <select className="input" value={createForm.role} onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}>
                <option value="TEACHER">Öğretmen</option>
                <option value="STUDENT">Öğrenci</option>
                <option value="PARENT">Veli</option>
                <option value="SCHOOL_ADMIN">Okul Yöneticisi</option>
              </select>
              {createForm.role === 'STUDENT' && (
                <input className="input" placeholder="Okul Numarası (opsiyonel)" value={createForm.studentNumber} onChange={(e) => setCreateForm({ ...createForm, studentNumber: e.target.value })} />
              )}
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary flex-1">İptal</button>
                <button type="submit" className="btn-primary flex-1">Oluştur</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">Kullanıcı Düzenle</h2>
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">E-posta</p>
              <p className="text-sm text-gray-700">{editingUser.email}</p>
              <p className="text-xs text-gray-500 mt-1">Rol</p>
              <p className="text-sm text-gray-700">{roleLabels[editingUser.role]}</p>
            </div>
            <form onSubmit={handleEdit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Ad</label>
                  <input className="input" placeholder="Ad" value={editForm.firstName} onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })} required />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Soyad</label>
                  <input className="input" placeholder="Soyad" value={editForm.lastName} onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })} required />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Telefon</label>
                <input className="input" placeholder="Telefon" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
              </div>
              <div className="flex items-center justify-between py-1">
                <label className="text-sm text-gray-700">Aktif</label>
                <button
                  type="button"
                  onClick={() => setEditForm({ ...editForm, isActive: !editForm.isActive })}
                  className={`relative w-11 h-6 rounded-full transition-colors ${editForm.isActive ? 'bg-primary-600' : 'bg-gray-300'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${editForm.isActive ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => { setShowEditModal(false); setEditingUser(null); }} className="btn-secondary flex-1">İptal</button>
                <button type="submit" className="btn-primary flex-1">Güncelle</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && deletingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Kullanıcı Sil</h2>
            <p className="text-sm text-gray-600 mb-6">
              <span className="font-medium text-gray-900">{deletingUser.firstName} {deletingUser.lastName}</span> adlı kullanıcıyı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setShowDeleteDialog(false); setDeletingUser(null); }}
                className="btn-secondary flex-1"
                disabled={deleteLoading}
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteLoading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleteLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
