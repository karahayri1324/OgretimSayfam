'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import toast from 'react-hot-toast';
import {
  GraduationCap,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  BookOpen,
  ChevronDown,
  Users,
  User,
  Plus,
  Pencil,
  Trash2,
  X,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface GradeCategory {
  id?: string;
  name: string;
  code: string;
  weight: number;
}

interface GradeItem {
  id: string;
  score: number;
  description?: string;
  date: string;
  subject: { id?: string; name: string; code?: string; color?: string };
  category: GradeCategory;
  teacherProfile?: { user: { firstName: string; lastName: string } };
  term?: { id: string; name: string };
  studentProfileId?: string;
  subjectId?: string;
  categoryId?: string;
  termId?: string;
}

interface SubjectGroup {
  subjectName: string;
  subjectCode?: string;
  color: string;
  grades: GradeItem[];
  average: number;
  trend: 'up' | 'down' | 'stable';
}

interface ClassStudent {
  id: string;
  studentNumber?: string;
  user: { firstName: string; lastName: string };
  grades: {
    id: string;
    score: number;
    date: string;
    description?: string;
    category: GradeCategory;
    categoryId?: string;
    subjectId?: string;
    termId?: string;
    studentProfileId?: string;
  }[];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const SUBJECT_COLORS = [
  '#2563eb', '#dc2626', '#16a34a', '#9333ea', '#ea580c',
  '#0891b2', '#ca8a04', '#be185d', '#4f46e5', '#059669',
  '#7c3aed', '#0284c7', '#b91c1c', '#65a30d', '#c026d3',
];

function getSubjectColor(name: string, apiColor?: string): string {
  if (apiColor) return apiColor;
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return SUBJECT_COLORS[Math.abs(hash) % SUBJECT_COLORS.length];
}

function scoreColorClass(score: number): string {
  if (score >= 85) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (score >= 70) return 'bg-blue-100 text-blue-700 border-blue-200';
  if (score >= 50) return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-red-100 text-red-700 border-red-200';
}

function scoreBadgeBg(score: number): string {
  if (score >= 85) return 'bg-emerald-500';
  if (score >= 70) return 'bg-blue-500';
  if (score >= 50) return 'bg-amber-500';
  return 'bg-red-500';
}

function computeWeightedAverage(grades: { score: number; category: { weight: number } }[]): number {
  if (grades.length === 0) return 0;
  let wSum = 0;
  let wTotal = 0;
  for (const g of grades) {
    wSum += g.score * g.category.weight;
    wTotal += g.category.weight;
  }
  return wTotal > 0 ? wSum / wTotal : 0;
}

function computeTrend(grades: GradeItem[]): 'up' | 'down' | 'stable' {
  if (grades.length < 2) return 'stable';
  const sorted = [...grades].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  const half = Math.floor(sorted.length / 2);
  const firstHalf = sorted.slice(0, half);
  const secondHalf = sorted.slice(half);
  const avgFirst = firstHalf.reduce((s, g) => s + g.score, 0) / firstHalf.length;
  const avgSecond = secondHalf.reduce((s, g) => s + g.score, 0) / secondHalf.length;
  const diff = avgSecond - avgFirst;
  if (diff > 3) return 'up';
  if (diff < -3) return 'down';
  return 'stable';
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function groupBySubject(grades: GradeItem[]): SubjectGroup[] {
  const map = new Map<string, GradeItem[]>();
  for (const g of grades) {
    const key = g.subject.name;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(g);
  }

  const entries = Array.from(map.entries());
  const groups: SubjectGroup[] = entries.map(([subjectName, subjectGrades]) => {
    const firstGrade = subjectGrades[0];
    return {
      subjectName,
      subjectCode: firstGrade.subject.code,
      color: getSubjectColor(subjectName, firstGrade.subject.color ?? undefined),
      grades: subjectGrades.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      ),
      average: computeWeightedAverage(subjectGrades),
      trend: computeTrend(subjectGrades),
    };
  });

  return groups.sort((a, b) => a.subjectName.localeCompare(b.subjectName, 'tr'));
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function OverallAverageBadge({ average, label }: { average: number; label?: string }) {
  const rounded = Math.round(average * 10) / 10;
  const circumference = 2 * Math.PI * 40;
  const progress = (rounded / 100) * circumference;

  return (
    <div className="card flex flex-col sm:flex-row items-center gap-6">
      {/* Circular indicator */}
      <div className="relative w-28 h-28 flex-shrink-0">
        <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" fill="none" stroke="#e5e7eb" strokeWidth="8" />
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke={rounded >= 85 ? '#10b981' : rounded >= 70 ? '#3b82f6' : rounded >= 50 ? '#f59e0b' : '#ef4444'}
            strokeWidth="8"
            strokeDasharray={`${progress} ${circumference}`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold text-gray-900">{rounded}</span>
        </div>
      </div>
      <div>
        <h2 className="text-lg font-bold text-gray-900">{label || 'Genel Ortalama'}</h2>
        <p className="text-sm text-gray-500 mt-1">
          {rounded >= 85 ? 'Pekiyi' : rounded >= 70 ? 'Iyi' : rounded >= 50 ? 'Orta' : 'Basarisiz'}
        </p>
      </div>
    </div>
  );
}

function TrendIcon({ trend }: { trend: 'up' | 'down' | 'stable' }) {
  if (trend === 'up') return <TrendingUp className="w-4 h-4 text-emerald-500" />;
  if (trend === 'down') return <TrendingDown className="w-4 h-4 text-red-500" />;
  return <Minus className="w-4 h-4 text-gray-400" />;
}

function SubjectCard({ group }: { group: SubjectGroup }) {
  const [expanded, setExpanded] = useState(false);
  const avgRounded = Math.round(group.average * 10) / 10;
  const visibleGrades = expanded ? group.grades : group.grades.slice(0, 3);

  return (
    <div className="card !p-0 overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
            style={{ backgroundColor: group.color }}
          >
            {group.subjectCode?.slice(0, 3) || group.subjectName.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{group.subjectName}</h3>
            <p className="text-xs text-gray-500">{group.grades.length} not</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <TrendIcon trend={group.trend} />
          <div
            className={`px-3 py-1.5 rounded-lg text-sm font-bold border ${scoreColorClass(avgRounded)}`}
          >
            {avgRounded}
          </div>
          <ChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          />
        </div>
      </div>

      {/* Grades list */}
      <div className="border-t border-gray-100">
        {visibleGrades.map((g) => (
          <div
            key={g.id}
            className="flex items-center justify-between px-5 py-3 border-b border-gray-50 last:border-b-0"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700">{g.category.name}</span>
                {g.description && (
                  <span className="text-xs text-gray-400 truncate">- {g.description}</span>
                )}
              </div>
              <span className="text-xs text-gray-400">{formatDate(g.date)}</span>
            </div>
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold border ${scoreColorClass(g.score)}`}
            >
              {g.score}
            </div>
          </div>
        ))}
        {!expanded && group.grades.length > 3 && (
          <button
            onClick={() => setExpanded(true)}
            className="w-full py-2 text-xs text-primary-600 hover:text-primary-700 font-medium hover:bg-gray-50 transition-colors"
          >
            +{group.grades.length - 3} not daha
          </button>
        )}
      </div>
    </div>
  );
}

function TermSelector({
  terms,
  selectedTermId,
  onChange,
}: {
  terms: { id: string; name: string }[];
  selectedTermId: string;
  onChange: (termId: string) => void;
}) {
  if (terms.length === 0) return null;
  return (
    <select
      className="input w-52"
      value={selectedTermId}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">Tum Donemler</option>
      {terms.map((t) => (
        <option key={t.id} value={t.id}>
          {t.name}
        </option>
      ))}
    </select>
  );
}

function EmptyState() {
  return (
    <div className="card text-center py-16">
      <GraduationCap className="w-16 h-16 mx-auto mb-4 text-gray-300" />
      <p className="text-gray-500 font-medium">Henuz not girilmemis</p>
      <p className="text-gray-400 text-sm mt-1">Bu donem icin not bulunmuyor.</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Create / Edit Grade Modal                                          */
/* ------------------------------------------------------------------ */

function GradeModal({
  mode,
  initialData,
  classes,
  subjects,
  categories,
  terms,
  onClose,
  onSaved,
}: {
  mode: 'create' | 'edit';
  initialData?: {
    id?: string;
    studentProfileId?: string;
    subjectId?: string;
    categoryId?: string;
    termId?: string;
    score?: number;
    description?: string;
    date?: string;
  };
  classes: { id: string; name: string }[];
  subjects: { id: string; name: string }[];
  categories: { id: string; name: string; code: string; weight: number }[];
  terms: { id: string; name: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id || '');
  const [classStudents, setClassStudents] = useState<{ id: string; user: { firstName: string; lastName: string } }[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);

  const [form, setForm] = useState({
    studentProfileId: initialData?.studentProfileId || '',
    subjectId: initialData?.subjectId || subjects[0]?.id || '',
    categoryId: initialData?.categoryId || categories[0]?.id || '',
    termId: initialData?.termId || terms[0]?.id || '',
    score: initialData?.score ?? 0,
    description: initialData?.description || '',
    date: initialData?.date
      ? new Date(initialData.date).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
  });

  const [submitting, setSubmitting] = useState(false);

  // Fetch students when class changes (only in create mode)
  useEffect(() => {
    if (mode === 'edit') return;
    if (!selectedClassId) return;
    setStudentsLoading(true);
    api
      .get(`/classes/${selectedClassId}`)
      .then(({ data }) => {
        const students = data.data?.students || [];
        setClassStudents(students);
        if (students.length > 0 && !form.studentProfileId) {
          setForm((prev) => ({ ...prev, studentProfileId: students[0].id }));
        }
      })
      .catch(() => toast.error('Ogrenciler yuklenemedi'))
      .finally(() => setStudentsLoading(false));
  }, [selectedClassId, mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === 'create') {
      if (!form.studentProfileId || !form.subjectId || !form.categoryId || !form.termId) {
        toast.error('Lutfen tum zorunlu alanlari doldurun');
        return;
      }
    }

    if (form.score < 0 || form.score > 100) {
      toast.error('Not 0-100 arasinda olmalidir');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'create') {
        await api.post('/grades', {
          studentProfileId: form.studentProfileId,
          subjectId: form.subjectId,
          categoryId: form.categoryId,
          termId: form.termId,
          score: Number(form.score),
          description: form.description || undefined,
          date: new Date(form.date).toISOString(),
        });
        toast.success('Not basariyla eklendi');
      } else {
        await api.put(`/grades/${initialData?.id}`, {
          score: Number(form.score),
          description: form.description || undefined,
        });
        toast.success('Not basariyla guncellendi');
      }
      onSaved();
      onClose();
    } catch (err: any) {
      const msg =
        err.response?.data?.message?.[0] ||
        err.response?.data?.message ||
        (mode === 'create' ? 'Not eklenemedi' : 'Not guncellenemedi');
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">
            {mode === 'create' ? 'Not Gir' : 'Notu Duzenle'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {mode === 'create' && (
            <>
              {/* Class selector (to filter students) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sinif *</label>
                <select
                  className="input"
                  value={selectedClassId}
                  onChange={(e) => {
                    setSelectedClassId(e.target.value);
                    setForm((prev) => ({ ...prev, studentProfileId: '' }));
                  }}
                >
                  <option value="">Sinif secin</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Student selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ogrenci *</label>
                {studentsLoading ? (
                  <div className="flex items-center gap-2 py-2 text-sm text-gray-400">
                    <Loader2 className="w-4 h-4 animate-spin" /> Yukleniyor...
                  </div>
                ) : (
                  <select
                    className="input"
                    value={form.studentProfileId}
                    onChange={(e) => setForm({ ...form, studentProfileId: e.target.value })}
                    required
                  >
                    <option value="">Ogrenci secin</option>
                    {classStudents.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.user.firstName} {st.user.lastName}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Subject */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ders *</label>
                <select
                  className="input"
                  value={form.subjectId}
                  onChange={(e) => setForm({ ...form, subjectId: e.target.value })}
                  required
                >
                  <option value="">Ders secin</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Term */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Donem *</label>
                <select
                  className="input"
                  value={form.termId}
                  onChange={(e) => setForm({ ...form, termId: e.target.value })}
                  required
                >
                  <option value="">Donem secin</option>
                  {terms.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Category */}
          {mode === 'create' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kategori *</label>
              <select
                className="input"
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                required
              >
                <option value="">Kategori secin</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} (Agirlik: %{Math.round(c.weight * 100)})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Score */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Not (0-100) *</label>
            <input
              type="number"
              className="input"
              min={0}
              max={100}
              value={form.score}
              onChange={(e) => setForm({ ...form, score: Number(e.target.value) })}
              required
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tarih *</label>
            <input
              type="date"
              className="input"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Aciklama</label>
            <textarea
              className="input min-h-[80px]"
              placeholder="Aciklama (istege bagli)"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Iptal
            </button>
            <button
              type="submit"
              className="btn-primary flex-1 flex items-center justify-center gap-2"
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : mode === 'create' ? (
                <Plus className="w-4 h-4" />
              ) : (
                <Pencil className="w-4 h-4" />
              )}
              {mode === 'create' ? 'Kaydet' : 'Guncelle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Delete Confirmation Modal                                          */
/* ------------------------------------------------------------------ */

function DeleteConfirmModal({
  title,
  message,
  onConfirm,
  onClose,
}: {
  title: string;
  message: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const [deleting, setDeleting] = useState(false);

  const handleConfirm = async () => {
    setDeleting(true);
    await onConfirm();
    setDeleting(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
          <p className="text-sm text-gray-500">{message}</p>
        </div>
        <div className="p-6 border-t border-gray-100 flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1" disabled={deleting}>
            Iptal
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
            disabled={deleting}
          >
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Sil
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Bulk Grade Modal                                                   */
/* ------------------------------------------------------------------ */

function BulkGradeModal({
  classes,
  subjects,
  categories,
  terms,
  initialClassId,
  initialSubjectId,
  initialTermId,
  onClose,
  onSaved,
}: {
  classes: { id: string; name: string }[];
  subjects: { id: string; name: string }[];
  categories: { id: string; name: string; code: string; weight: number }[];
  terms: { id: string; name: string }[];
  initialClassId: string;
  initialSubjectId: string;
  initialTermId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [selectedClassId, setSelectedClassId] = useState(initialClassId || classes[0]?.id || '');
  const [selectedSubjectId, setSelectedSubjectId] = useState(initialSubjectId || subjects[0]?.id || '');
  const [selectedTermId, setSelectedTermId] = useState(initialTermId || terms[0]?.id || '');
  const [selectedCategoryId, setSelectedCategoryId] = useState(categories[0]?.id || '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [classStudents, setClassStudents] = useState<{ id: string; studentNumber?: string; user: { firstName: string; lastName: string } }[]>([]);
  const [scores, setScores] = useState<Record<string, string>>({});
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Fetch students when class changes
  useEffect(() => {
    if (!selectedClassId) return;
    setStudentsLoading(true);
    api
      .get(`/classes/${selectedClassId}`)
      .then(({ data }) => {
        const students = data.data?.students || [];
        setClassStudents(students);
        setScores({});
      })
      .catch(() => toast.error('Ogrenciler yuklenemedi'))
      .finally(() => setStudentsLoading(false));
  }, [selectedClassId]);

  const handleScoreChange = (studentId: string, value: string) => {
    const numVal = value === '' ? '' : value;
    setScores((prev) => ({ ...prev, [studentId]: numVal }));
  };

  const handleSubmit = async () => {
    if (!selectedClassId || !selectedSubjectId || !selectedTermId || !selectedCategoryId) {
      toast.error('Lutfen tum zorunlu alanlari doldurun');
      return;
    }

    const gradeEntries = Object.entries(scores)
      .filter(([, val]) => val !== '' && val !== undefined)
      .map(([studentProfileId, val]) => ({
        studentProfileId,
        score: Number(val),
      }))
      .filter((e) => e.score >= 0 && e.score <= 100);

    if (gradeEntries.length === 0) {
      toast.error('En az bir ogrenci icin not girin');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/grades/bulk', {
        classId: selectedClassId,
        subjectId: selectedSubjectId,
        termId: selectedTermId,
        categoryId: selectedCategoryId,
        date: new Date(date).toISOString(),
        description: description || undefined,
        grades: gradeEntries,
      });
      toast.success(`${gradeEntries.length} ogrenci icin notlar basariyla kaydedildi`);
      onSaved();
      onClose();
    } catch (err: any) {
      const msg =
        err.response?.data?.message?.[0] ||
        err.response?.data?.message ||
        'Toplu not girisi basarisiz';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Toplu Not Gir</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Filters row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sinif *</label>
              <select
                className="input"
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
              >
                <option value="">Sinif secin</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ders *</label>
              <select
                className="input"
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
              >
                <option value="">Ders secin</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Donem *</label>
              <select
                className="input"
                value={selectedTermId}
                onChange={(e) => setSelectedTermId(e.target.value)}
              >
                <option value="">Donem secin</option>
                {terms.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kategori *</label>
              <select
                className="input"
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
              >
                <option value="">Kategori secin</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} (Agirlik: %{Math.round(c.weight * 100)})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tarih *</label>
              <input
                type="date"
                className="input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Aciklama</label>
              <input
                type="text"
                className="input"
                placeholder="Aciklama (istege bagli)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          {/* Students table */}
          {studentsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
            </div>
          ) : classStudents.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-400 text-sm">
                {selectedClassId ? 'Bu sinifta ogrenci yok' : 'Sinif secin'}
              </p>
            </div>
          ) : (
            <div className="border rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">#</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Ogrenci</th>
                    <th className="text-center text-xs font-medium text-gray-500 px-4 py-3 w-32">Not (0-100)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {classStudents.map((st, idx) => (
                    <tr key={st.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm text-gray-400">{idx + 1}</td>
                      <td className="px-4 py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center">
                            <User className="w-3.5 h-3.5 text-primary-600" />
                          </div>
                          {st.studentNumber && (
                            <span className="text-xs text-gray-400 font-mono bg-gray-100 px-1.5 py-0.5 rounded">{st.studentNumber}</span>
                          )}
                          <span className="text-sm font-medium text-gray-900">
                            {st.user.firstName} {st.user.lastName}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          className="input w-24 text-center mx-auto"
                          placeholder="-"
                          value={scores[st.id] ?? ''}
                          onChange={(e) => handleScoreChange(st.id, e.target.value)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Iptal
            </button>
            <button
              onClick={handleSubmit}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
              disabled={submitting || classStudents.length === 0}
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              Tumunu Kaydet
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Student / Parent View                                              */
/* ------------------------------------------------------------------ */

function StudentGradesView({ studentProfileId }: { studentProfileId: string }) {
  const [loading, setLoading] = useState(true);
  const [grades, setGrades] = useState<GradeItem[]>([]);
  const [selectedTermId, setSelectedTermId] = useState('');

  const fetchGrades = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (selectedTermId) params.termId = selectedTermId;
      const { data } = await api.get(`/grades/student/${studentProfileId}`, { params });
      setGrades(data.data || []);
    } catch {
      toast.error('Notlar yuklenemedi');
    } finally {
      setLoading(false);
    }
  }, [studentProfileId, selectedTermId]);

  useEffect(() => {
    fetchGrades();
  }, [fetchGrades]);

  // Extract unique terms from grades (use full dataset for term list)
  const terms = useMemo(() => {
    const map = new Map<string, string>();
    for (const g of grades) {
      if (g.term) map.set(g.term.id, g.term.name);
    }
    return Array.from(map, ([id, name]) => ({ id, name }));
  }, [grades]);

  const subjectGroups = useMemo(() => groupBySubject(grades), [grades]);

  const overallAverage = useMemo(() => {
    if (subjectGroups.length === 0) return 0;
    const sum = subjectGroups.reduce((s, g) => s + g.average, 0);
    return sum / subjectGroups.length;
  }, [subjectGroups]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Term selector */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <TermSelector terms={terms} selectedTermId={selectedTermId} onChange={setSelectedTermId} />
      </div>

      {grades.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* Overall average */}
          <OverallAverageBadge average={overallAverage} />

          {/* Subject cards grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {subjectGroups.map((group) => (
              <SubjectCard key={group.subjectName} group={group} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Teacher View                                                       */
/* ------------------------------------------------------------------ */

function TeacherGradesView() {
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; name: string; color?: string }[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string; code: string; weight: number }[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedTermId, setSelectedTermId] = useState('');
  const [terms, setTerms] = useState<{ id: string; name: string }[]>([]);
  const [students, setStudents] = useState<ClassStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);

  // Modal state
  const [gradeModal, setGradeModal] = useState<{
    mode: 'create' | 'edit';
    initialData?: any;
  } | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ gradeId: string } | null>(null);
  const [bulkModal, setBulkModal] = useState(false);

  // Fetch classes, subjects, and categories on mount
  useEffect(() => {
    const fetchInit = async () => {
      try {
        const [classRes, subjectRes, catRes] = await Promise.all([
          api.get('/classes'),
          api.get('/subjects'),
          api.get('/grades/categories'),
        ]);
        const classList = classRes.data.data || [];
        const subjectList = subjectRes.data.data || [];
        const catList = catRes.data.data || [];
        setClasses(classList);
        setSubjects(subjectList);
        setCategories(catList);
        if (classList.length > 0) setSelectedClassId(classList[0].id);
        if (subjectList.length > 0) setSelectedSubjectId(subjectList[0].id);
      } catch {
        toast.error('Veriler yuklenemedi');
      } finally {
        setLoading(false);
      }
    };
    fetchInit();
  }, []);

  // Fetch students and grades
  const fetchClassGrades = useCallback(() => {
    if (!selectedClassId || !selectedSubjectId) return;
    setTableLoading(true);

    const params: Record<string, string> = { subjectId: selectedSubjectId };
    if (selectedTermId) params.termId = selectedTermId;

    api
      .get(`/grades/class/${selectedClassId}`, { params })
      .then(({ data }) => {
        const studentList: ClassStudent[] = data.data || [];
        setStudents(studentList);

        // Extract terms from grades
        if (!selectedTermId) {
          const termMap = new Map<string, string>();
          for (const st of studentList) {
            for (const g of (st as any).grades || []) {
              if (g.term) termMap.set(g.term.id, g.term.name);
            }
          }
          if (termMap.size > 0) {
            setTerms(Array.from(termMap, ([id, name]) => ({ id, name })));
          }
        }
      })
      .catch(() => {
        toast.error('Sinif notlari yuklenemedi');
      })
      .finally(() => setTableLoading(false));
  }, [selectedClassId, selectedSubjectId, selectedTermId]);

  useEffect(() => {
    fetchClassGrades();
  }, [fetchClassGrades]);

  // Delete handler
  const handleDeleteGrade = async (gradeId: string) => {
    try {
      await api.delete(`/grades/${gradeId}`);
      toast.success('Not basariyla silindi');
      fetchClassGrades();
    } catch {
      toast.error('Not silinemedi');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  if (classes.length === 0) {
    return (
      <div className="card text-center py-16">
        <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
        <p className="text-gray-500 font-medium">Henuz sinif tanimlanmamis</p>
      </div>
    );
  }

  // Compute averages for the table
  const studentsWithAvg = students.map((st) => {
    const avg =
      st.grades.length > 0 ? computeWeightedAverage(st.grades) : null;
    return { ...st, avg };
  });

  const classAverage =
    studentsWithAvg.filter((s) => s.avg !== null).length > 0
      ? studentsWithAvg.filter((s) => s.avg !== null).reduce((s, st) => s + (st.avg || 0), 0) /
        studentsWithAvg.filter((s) => s.avg !== null).length
      : null;

  return (
    <div className="space-y-6">
      {/* Filters + Add button */}
      <div className="flex flex-wrap gap-3 items-center">
        <select
          className="input w-48"
          value={selectedClassId}
          onChange={(e) => setSelectedClassId(e.target.value)}
        >
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          className="input w-48"
          value={selectedSubjectId}
          onChange={(e) => setSelectedSubjectId(e.target.value)}
        >
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <TermSelector terms={terms} selectedTermId={selectedTermId} onChange={setSelectedTermId} />

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setBulkModal(true)}
            className="btn-secondary flex items-center gap-2"
          >
            <Users className="w-4 h-4" />
            Toplu Not Gir
          </button>
          <button
            onClick={() =>
              setGradeModal({
                mode: 'create',
                initialData: {
                  subjectId: selectedSubjectId,
                  termId: selectedTermId || terms[0]?.id || '',
                },
              })
            }
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Not Gir
          </button>
        </div>
      </div>

      {/* Class average summary */}
      {classAverage !== null && (
        <div className="card flex items-center gap-4">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold ${scoreBadgeBg(classAverage)}`}
          >
            {Math.round(classAverage * 10) / 10}
          </div>
          <div>
            <p className="font-semibold text-gray-900">Sinif Ortalamasi</p>
            <p className="text-sm text-gray-500">
              {studentsWithAvg.filter((s) => s.avg !== null).length} ogrenci
            </p>
          </div>
        </div>
      )}

      {/* Students table */}
      <div className="card !p-0 overflow-hidden">
        {tableLoading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-6 h-6 text-primary-600 animate-spin mx-auto" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left text-xs font-medium text-gray-500 px-6 py-3">#</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-6 py-3">
                      Ogrenci
                    </th>
                    <th className="text-center text-xs font-medium text-gray-500 px-6 py-3">
                      Notlar
                    </th>
                    <th className="text-center text-xs font-medium text-gray-500 px-6 py-3">
                      Ortalama
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {studentsWithAvg.map((st, idx) => (
                    <tr key={st.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3 text-sm text-gray-400">{idx + 1}</td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                            <User className="w-4 h-4 text-primary-600" />
                          </div>
                          {st.studentNumber && (
                            <span className="text-xs text-gray-400 font-mono bg-gray-100 px-1.5 py-0.5 rounded">{st.studentNumber}</span>
                          )}
                          <span className="text-sm font-medium text-gray-900">
                            {st.user.firstName} {st.user.lastName}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {st.grades.length === 0 ? (
                            <span className="text-xs text-gray-400">-</span>
                          ) : (
                            st.grades.map((g) => (
                              <div key={g.id} className="relative group">
                                <span
                                  className={`inline-flex items-center justify-center w-9 h-9 rounded-lg text-xs font-bold border ${scoreColorClass(g.score)}`}
                                  title={`${g.category.name} - ${formatDate(g.date)}`}
                                >
                                  {g.score}
                                </span>
                                {/* Edit/Delete buttons on hover */}
                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:flex items-center gap-1 bg-white shadow-lg rounded-lg px-1 py-0.5 border border-gray-200 z-10">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setGradeModal({
                                        mode: 'edit',
                                        initialData: {
                                          id: g.id,
                                          score: g.score,
                                          description: g.description,
                                          date: g.date,
                                          categoryId: g.categoryId,
                                          subjectId: g.subjectId,
                                          termId: g.termId,
                                          studentProfileId: g.studentProfileId || st.id,
                                        },
                                      });
                                    }}
                                    className="p-1 hover:bg-blue-50 rounded transition-colors"
                                    title="Duzenle"
                                  >
                                    <Pencil className="w-3 h-3 text-blue-600" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setDeleteModal({ gradeId: g.id });
                                    }}
                                    className="p-1 hover:bg-red-50 rounded transition-colors"
                                    title="Sil"
                                  >
                                    <Trash2 className="w-3 h-3 text-red-600" />
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-3 text-center">
                        {st.avg !== null ? (
                          <span
                            className={`inline-flex items-center justify-center px-3 py-1.5 rounded-lg text-sm font-bold border ${scoreColorClass(st.avg)}`}
                          >
                            {Math.round(st.avg * 10) / 10}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {students.length === 0 && (
              <div className="p-12 text-center">
                <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-400 text-sm">Bu sinifta ogrenci yok</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Grade Create/Edit Modal */}
      {gradeModal && (
        <GradeModal
          mode={gradeModal.mode}
          initialData={gradeModal.initialData}
          classes={classes}
          subjects={subjects}
          categories={categories}
          terms={terms}
          onClose={() => setGradeModal(null)}
          onSaved={fetchClassGrades}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <DeleteConfirmModal
          title="Notu Sil"
          message="Bu notu silmek istediginizden emin misiniz? Bu islem geri alinamaz."
          onConfirm={async () => {
            await handleDeleteGrade(deleteModal.gradeId);
            setDeleteModal(null);
          }}
          onClose={() => setDeleteModal(null)}
        />
      )}

      {/* Bulk Grade Modal */}
      {bulkModal && (
        <BulkGradeModal
          classes={classes}
          subjects={subjects}
          categories={categories}
          terms={terms}
          initialClassId={selectedClassId}
          initialSubjectId={selectedSubjectId}
          initialTermId={selectedTermId || terms[0]?.id || ''}
          onClose={() => setBulkModal(false)}
          onSaved={fetchClassGrades}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function GradesPage() {
  const { user } = useAuthStore();

  const isStudent = user?.role === 'STUDENT';
  const isParent = user?.role === 'PARENT';
  const isTeacher = user?.role === 'TEACHER' || user?.role === 'SCHOOL_ADMIN' || user?.role === 'SUPER_ADMIN';

  // For parent: we need to figure out the child's studentProfileId.
  // The parent endpoint doesn't exist in the backend, so we fetch children info.
  const [childStudentProfileId, setChildStudentProfileId] = useState<string | null>(null);
  const [parentLoading, setParentLoading] = useState(isParent);

  useEffect(() => {
    if (!isParent || !user?.parentProfileId) return;
    // Try the parent-specific grades endpoint first, or get children list
    api
      .get(`/grades/parent/${user.parentProfileId}`)
      .then(({ data }) => {
        // If the endpoint works, we'll handle it differently
        // For now, if it returns grades, extract the studentProfileId
        const grades = data.data || [];
        if (grades.length > 0 && grades[0].studentProfileId) {
          setChildStudentProfileId(grades[0].studentProfileId);
        }
        setParentLoading(false);
      })
      .catch(() => {
        // Endpoint doesn't exist; fall back - parent can't view grades yet
        setParentLoading(false);
      });
  }, [isParent, user?.parentProfileId]);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-primary-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notlar</h1>
          <p className="text-sm text-gray-500">
            {isTeacher
              ? 'Sinif ve ders bazli not gorunumu'
              : 'Ders bazli not ve ortalama gorunumu'}
          </p>
        </div>
      </div>

      {/* Content by role */}
      {isStudent && user?.studentProfileId && (
        <StudentGradesView studentProfileId={user.studentProfileId} />
      )}

      {isParent && parentLoading && (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
        </div>
      )}

      {isParent && !parentLoading && childStudentProfileId && (
        <StudentGradesView studentProfileId={childStudentProfileId} />
      )}

      {isParent && !parentLoading && !childStudentProfileId && (
        <div className="card text-center py-16">
          <GraduationCap className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p className="text-gray-500 font-medium">Ogrenci notlari bulunamadi</p>
          <p className="text-gray-400 text-sm mt-1">
            Velinize bagli ogrenci bilgisi henuz tanimlanmamis olabilir.
          </p>
        </div>
      )}

      {isTeacher && <TeacherGradesView />}

      {!isStudent && !isParent && !isTeacher && (
        <div className="card">
          <p className="text-gray-600">
            Not goruntuleme icin sol menuden ilgili bolumu secin.
          </p>
        </div>
      )}
    </div>
  );
}
