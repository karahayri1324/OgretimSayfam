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
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface GradeCategory {
  name: string;
  code: string;
  weight: number;
}

interface GradeItem {
  id: string;
  score: number;
  description?: string;
  date: string;
  subject: { name: string; code?: string; color?: string };
  category: GradeCategory;
  teacherProfile?: { user: { firstName: string; lastName: string } };
  term?: { id: string; name: string };
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
  user: { firstName: string; lastName: string };
  grades: {
    id: string;
    score: number;
    date: string;
    category: GradeCategory;
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
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedTermId, setSelectedTermId] = useState('');
  const [terms, setTerms] = useState<{ id: string; name: string }[]>([]);
  const [students, setStudents] = useState<ClassStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);

  // Fetch classes and subjects on mount
  useEffect(() => {
    const fetchInit = async () => {
      try {
        const [classRes, subjectRes] = await Promise.all([
          api.get('/classes'),
          api.get('/subjects'),
        ]);
        const classList = classRes.data.data || [];
        const subjectList = subjectRes.data.data || [];
        setClasses(classList);
        setSubjects(subjectList);
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

  // Fetch terms from first student's grades to populate term dropdown
  // We use a separate lightweight call when class/subject changes
  useEffect(() => {
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
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
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
                              <span
                                key={g.id}
                                className={`inline-flex items-center justify-center w-9 h-9 rounded-lg text-xs font-bold border ${scoreColorClass(g.score)}`}
                                title={`${g.category.name} - ${formatDate(g.date)}`}
                              >
                                {g.score}
                              </span>
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
  const isTeacher = user?.role === 'TEACHER';

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
