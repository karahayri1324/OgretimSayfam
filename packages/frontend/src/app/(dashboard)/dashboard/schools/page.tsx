'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import { School, Plus, Edit2, Trash2, Loader2, Globe, Mail, Phone, MapPin } from 'lucide-react';

export default function SchoolsPage() {
  const { user } = useAuthStore();
  const [schools, setSchools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSchool, setEditingSchool] = useState<any>(null);

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const loadSchools = async () => {
    try {
      const { data } = await api.get('/schools');
      setSchools(data.data || []);
    } catch {
      toast.error('Okullar yüklenemedi');
    } finally { setLoading(false); }
  };

  useEffect(() => { loadSchools(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Bu okulu silmek istediğinize emin misiniz? Bu işlem geri alınamaz.')) return;
    try {
      await api.delete(`/schools/${id}`);
      toast.success('Okul silindi');
      loadSchools();
    } catch {
      toast.error('Silme başarısız');
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="card text-center py-12">
        <School className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p className="text-gray-400">Bu sayfaya erişim yetkiniz yok</p>
      </div>
    );
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 text-primary-600 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Okul Yönetimi</h1>
        <button onClick={() => { setEditingSchool(null); setShowModal(true); }} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Yeni Okul
        </button>
      </div>

      {/* Schools Grid */}
      {schools.length === 0 ? (
        <div className="card text-center py-12">
          <School className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-400 text-sm">Henüz okul eklenmemiş</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {schools.map((school: any) => (
            <div key={school.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                    <School className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">{school.name}</h3>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Globe className="w-3 h-3" />
                      {school.slug}.ogretimsayfam.com
                    </div>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  school.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {school.isActive ? 'Aktif' : 'Pasif'}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-gray-500">
                {school.email && (
                  <div className="flex items-center gap-2"><Mail className="w-3 h-3" />{school.email}</div>
                )}
                {school.phone && (
                  <div className="flex items-center gap-2"><Phone className="w-3 h-3" />{school.phone}</div>
                )}
                {school.address && (
                  <div className="flex items-center gap-2"><MapPin className="w-3 h-3" />{school.address}</div>
                )}
              </div>

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                <span className="text-xs text-gray-400">{formatDate(school.createdAt)}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setEditingSchool(school); setShowModal(true); }}
                    className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(school.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <SchoolModal
          school={editingSchool}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); loadSchools(); }}
        />
      )}
    </div>
  );
}

function SchoolModal({ school, onClose, onSaved }: {
  school: any; onClose: () => void; onSaved: () => void;
}) {
  const [name, setName] = useState(school?.name || '');
  const [slug, setSlug] = useState(school?.slug || '');
  const [email, setEmail] = useState(school?.email || '');
  const [phone, setPhone] = useState(school?.phone || '');
  const [address, setAddress] = useState(school?.address || '');
  const [isActive, setIsActive] = useState(school?.isActive ?? true);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name || !slug) { toast.error('Ad ve slug gerekli'); return; }
    setSaving(true);
    try {
      const payload = { name, slug, email: email || undefined, phone: phone || undefined, address: address || undefined, isActive };
      if (school) {
        await api.put(`/schools/${school.id}`, payload);
        toast.success('Okul güncellendi');
      } else {
        await api.post('/schools', payload);
        toast.success('Okul oluşturuldu');
      }
      onSaved();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'İşlem başarısız');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
        <h3 className="text-lg font-semibold mb-4">{school ? 'Okul Düzenle' : 'Yeni Okul'}</h3>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Okul Adı *</label>
            <input className="input w-full" value={name} onChange={e => setName(e.target.value)} placeholder="Örnek: Atatürk Lisesi" />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Slug (Alt alan adı) *</label>
            <div className="flex items-center gap-0">
              <input className="input flex-1 rounded-r-none" value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} placeholder="ataturk-lisesi" />
              <span className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg text-sm text-gray-500">.ogretimsayfam.com</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">E-posta</label>
              <input className="input w-full" type="email" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Telefon</label>
              <input className="input w-full" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Adres</label>
            <textarea className="input w-full" rows={2} value={address} onChange={e => setAddress(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="isActive" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="w-4 h-4 rounded border-gray-300 text-primary-600" />
            <label htmlFor="isActive" className="text-sm text-gray-700">Aktif</label>
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
