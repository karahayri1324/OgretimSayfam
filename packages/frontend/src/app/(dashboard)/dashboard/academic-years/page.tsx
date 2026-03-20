'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import {
  CalendarRange, Plus, Edit2, Trash2, Loader2, ChevronDown, ChevronRight,
  Star, Calendar,
} from 'lucide-react';

interface Term {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  academicYearId: string;
}

interface AcademicYear {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  terms: Term[];
}

export default function AcademicYearsPage() {
  const { user } = useAuthStore();
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedYears, setExpandedYears] = useState<Set<string>>(new Set());

  // Modal states
  const [showYearModal, setShowYearModal] = useState(false);
  const [editingYear, setEditingYear] = useState<AcademicYear | null>(null);
  const [showTermModal, setShowTermModal] = useState(false);
  const [editingTerm, setEditingTerm] = useState<Term | null>(null);
  const [termParentYearId, setTermParentYearId] = useState<string>('');

  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'SCHOOL_ADMIN';

  const loadYears = async () => {
    try {
      const { data } = await api.get('/academic-years');
      const list = data.data || [];
      setYears(list);
      // Auto-expand current year
      const current = list.find((y: AcademicYear) => y.isCurrent);
      if (current) {
        setExpandedYears(new Set([current.id]));
      }
    } catch {
      toast.error('Akademik yıllar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadYears();
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedYears((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDeleteYear = async (id: string) => {
    if (!confirm('Bu akademik yılı ve tüm dönemlerini silmek istediğinize emin misiniz?')) return;
    try {
      await api.delete(`/academic-years/${id}`);
      toast.success('Akademik yıl silindi');
      loadYears();
    } catch {
      toast.error('Silme başarısız');
    }
  };

  const handleSetCurrentYear = async (id: string) => {
    try {
      await api.put(`/academic-years/${id}/set-current`);
      toast.success('Aktif akademik yıl güncellendi');
      loadYears();
    } catch {
      toast.error('İşlem başarısız');
    }
  };

  const handleDeleteTerm = async (termId: string) => {
    if (!confirm('Bu dönemi silmek istediğinize emin misiniz?')) return;
    try {
      await api.delete(`/academic-years/terms/${termId}`);
      toast.success('Dönem silindi');
      loadYears();
    } catch {
      toast.error('Silme başarısız');
    }
  };

  const handleSetCurrentTerm = async (termId: string) => {
    try {
      await api.put(`/academic-years/terms/${termId}/set-current`);
      toast.success('Aktif dönem güncellendi');
      loadYears();
    } catch {
      toast.error('İşlem başarısız');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Akademik Yıl Yönetimi</h1>
        {isAdmin && (
          <button
            onClick={() => {
              setEditingYear(null);
              setShowYearModal(true);
            }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Yeni Akademik Yıl
          </button>
        )}
      </div>

      {years.length === 0 ? (
        <div className="card text-center py-12">
          <CalendarRange className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-400 text-sm">Henüz akademik yıl eklenmemiş</p>
        </div>
      ) : (
        <div className="space-y-4">
          {years.map((year) => (
            <div key={year.id} className="card">
              {/* Year Header */}
              <div className="flex items-center justify-between">
                <div
                  className="flex items-center gap-3 cursor-pointer flex-1"
                  onClick={() => toggleExpand(year.id)}
                >
                  {expandedYears.has(year.id) ? (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  )}
                  <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center">
                    <CalendarRange className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-gray-900">{year.name}</h3>
                      {year.isCurrent && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                          Aktif
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      {formatDate(year.startDate)} - {formatDate(year.endDate)}
                      <span className="ml-2 text-gray-400">
                        ({year.terms.length} dönem)
                      </span>
                    </p>
                  </div>
                </div>

                {isAdmin && (
                  <div className="flex items-center gap-1">
                    {!year.isCurrent && (
                      <button
                        onClick={() => handleSetCurrentYear(year.id)}
                        title="Aktif yap"
                        className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg"
                      >
                        <Star className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setEditingYear(year);
                        setShowYearModal(true);
                      }}
                      className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteYear(year.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Terms List (expanded) */}
              {expandedYears.has(year.id) && (
                <div className="mt-4 ml-8 space-y-2">
                  {isAdmin && (
                    <button
                      onClick={() => {
                        setEditingTerm(null);
                        setTermParentYearId(year.id);
                        setShowTermModal(true);
                      }}
                      className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1 mb-2"
                    >
                      <Plus className="w-3 h-3" />
                      Dönem Ekle
                    </button>
                  )}

                  {year.terms.length === 0 ? (
                    <p className="text-xs text-gray-400 py-2">Henüz dönem eklenmemiş</p>
                  ) : (
                    year.terms.map((term) => (
                      <div
                        key={term.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-800">
                                {term.name}
                              </span>
                              {term.isCurrent && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                                  Aktif
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500">
                              {formatDate(term.startDate)} - {formatDate(term.endDate)}
                            </p>
                          </div>
                        </div>

                        {isAdmin && (
                          <div className="flex items-center gap-1">
                            {!term.isCurrent && (
                              <button
                                onClick={() => handleSetCurrentTerm(term.id)}
                                title="Aktif yap"
                                className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg"
                              >
                                <Star className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setEditingTerm(term);
                                setTermParentYearId(year.id);
                                setShowTermModal(true);
                              }}
                              className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteTerm(term.id)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Academic Year Modal */}
      {showYearModal && (
        <AcademicYearModal
          year={editingYear}
          onClose={() => setShowYearModal(false)}
          onSaved={() => {
            setShowYearModal(false);
            loadYears();
          }}
        />
      )}

      {/* Term Modal */}
      {showTermModal && (
        <TermModal
          term={editingTerm}
          academicYearId={termParentYearId}
          onClose={() => setShowTermModal(false)}
          onSaved={() => {
            setShowTermModal(false);
            loadYears();
          }}
        />
      )}
    </div>
  );
}

function AcademicYearModal({
  year,
  onClose,
  onSaved,
}: {
  year: AcademicYear | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(year?.name || '');
  const [startDate, setStartDate] = useState(
    year?.startDate ? new Date(year.startDate).toISOString().split('T')[0] : '',
  );
  const [endDate, setEndDate] = useState(
    year?.endDate ? new Date(year.endDate).toISOString().split('T')[0] : '',
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name || !startDate || !endDate) {
      toast.error('Tüm alanlar gereklidir');
      return;
    }
    if (new Date(startDate) >= new Date(endDate)) {
      toast.error('Başlangıç tarihi bitiş tarihinden önce olmalıdır');
      return;
    }
    setSaving(true);
    try {
      const payload = { name, startDate, endDate };
      if (year) {
        await api.put(`/academic-years/${year.id}`, payload);
        toast.success('Akademik yıl güncellendi');
      } else {
        await api.post('/academic-years', payload);
        toast.success('Akademik yıl oluşturuldu');
      }
      onSaved();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'İşlem başarısız');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
        <h3 className="text-lg font-semibold mb-4">
          {year ? 'Akademik Yıl Düzenle' : 'Yeni Akademik Yıl'}
        </h3>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              Akademik Yıl Adı *
            </label>
            <input
              className="input w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Örnek: 2025-2026"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Başlangıç Tarihi *
              </label>
              <input
                className="input w-full"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Bitiş Tarihi *
              </label>
              <input
                className="input w-full"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="btn-secondary">
            İptal
          </button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
}

function TermModal({
  term,
  academicYearId,
  onClose,
  onSaved,
}: {
  term: Term | null;
  academicYearId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(term?.name || '');
  const [startDate, setStartDate] = useState(
    term?.startDate ? new Date(term.startDate).toISOString().split('T')[0] : '',
  );
  const [endDate, setEndDate] = useState(
    term?.endDate ? new Date(term.endDate).toISOString().split('T')[0] : '',
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name || !startDate || !endDate) {
      toast.error('Tüm alanlar gereklidir');
      return;
    }
    if (new Date(startDate) >= new Date(endDate)) {
      toast.error('Başlangıç tarihi bitiş tarihinden önce olmalıdır');
      return;
    }
    setSaving(true);
    try {
      const payload = { name, startDate, endDate };
      if (term) {
        await api.put(`/academic-years/terms/${term.id}`, payload);
        toast.success('Dönem güncellendi');
      } else {
        await api.post(`/academic-years/${academicYearId}/terms`, payload);
        toast.success('Dönem oluşturuldu');
      }
      onSaved();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'İşlem başarısız');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
        <h3 className="text-lg font-semibold mb-4">
          {term ? 'Dönem Düzenle' : 'Yeni Dönem'}
        </h3>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              Dönem Adı *
            </label>
            <input
              className="input w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Örnek: 1. Dönem"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Başlangıç Tarihi *
              </label>
              <input
                className="input w-full"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Bitiş Tarihi *
              </label>
              <input
                className="input w-full"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="btn-secondary">
            İptal
          </button>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
}
