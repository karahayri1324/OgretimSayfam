'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import {
  Plus,
  FileText,
  Loader2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  X,
  ChevronDown,
  ChevronUp,
  Filter,
  ArrowUpDown,
  Star,
  Users,
  ClipboardList,
  Calendar,
  BookOpen,
  User,
  Pencil,
  Trash2,
  Award,
} from 'lucide-react';
import { formatDate, formatDateTime } from '@/lib/utils';
import toast from 'react-hot-toast';

const SUBJECT_COLORS = [
  '#2563eb', '#dc2626', '#16a34a', '#9333ea', '#ea580c',
  '#0891b2', '#ca8a04', '#be185d', '#4f46e5', '#059669',
  '#7c3aed', '#0284c7', '#b91c1c', '#65a30d', '#c026d3',
];

const STATUS_LABELS: Record<string, string> = {
  ALL: 'Tumu',
  PENDING: 'Bekleyen',
  SUBMITTED: 'Teslim Edildi',
  OVERDUE: 'Gec Kaldi',
  GRADED: 'Puanlandi',
};

const SORT_OPTIONS = [
  { value: 'dueDate', label: 'Teslim Tarihi' },
  { value: 'subject', label: 'Ders' },
  { value: 'status', label: 'Durum' },
];

function getSubjectColor(name: string, apiColor?: string | null): string {
  if (apiColor) return apiColor;
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return SUBJECT_COLORS[Math.abs(hash) % SUBJECT_COLORS.length];
}

function getDaysUntilDue(dueDate: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function getAssignmentStatus(a: any): string {
  const submission = a.submissions?.[0];
  if (submission?.status === 'GRADED') return 'GRADED';
  if (submission?.status === 'SUBMITTED' || submission?.status === 'LATE') return 'SUBMITTED';
  const daysLeft = getDaysUntilDue(a.dueDate);
  if (daysLeft < 0) return 'OVERDUE';
  return 'PENDING';
}

function DueDateBadge({ dueDate, status }: { dueDate: string; status: string }) {
  if (status === 'GRADED') {
    return (
      <span className="badge badge-purple flex items-center gap-1">
        <Star className="w-3 h-3" />
        Puanlandi
      </span>
    );
  }
  if (status === 'SUBMITTED') {
    return (
      <span className="badge badge-green flex items-center gap-1">
        <CheckCircle2 className="w-3 h-3" />
        Teslim Edildi
      </span>
    );
  }

  const daysLeft = getDaysUntilDue(dueDate);

  if (daysLeft < 0) {
    return (
      <span className="badge badge-red flex items-center gap-1">
        <AlertTriangle className="w-3 h-3" />
        Suresi gecti
      </span>
    );
  }
  if (daysLeft === 0) {
    return (
      <span className="badge badge-red flex items-center gap-1 animate-pulse">
        <Clock className="w-3 h-3" />
        Bugun son gun!
      </span>
    );
  }
  if (daysLeft <= 2) {
    return (
      <span className="badge badge-orange flex items-center gap-1">
        <Clock className="w-3 h-3" />
        {daysLeft} gun kaldi
      </span>
    );
  }
  return (
    <span className="badge badge-blue flex items-center gap-1">
      <Calendar className="w-3 h-3" />
      {daysLeft} gun kaldi
    </span>
  );
}

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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4" onClick={onClose}>
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

function AssignmentDetailModal({
  assignment,
  onClose,
}: {
  assignment: any;
  onClose: () => void;
}) {
  const status = getAssignmentStatus(assignment);
  const submission = assignment.submissions?.[0];
  const subjectColor = getSubjectColor(
    assignment.subject?.name || '',
    assignment.subject?.color,
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: subjectColor }}
              />
              <span className="text-sm font-medium text-gray-500">
                {assignment.subject?.name}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mt-3">{assignment.title}</h2>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <DueDateBadge dueDate={assignment.dueDate} status={status} />
            <span className="text-sm text-gray-500">
              Son tarih: {formatDateTime(assignment.dueDate)}
            </span>
          </div>

          {assignment.description && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Aciklama</h3>
              <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
                {assignment.description}
              </p>
            </div>
          )}

          {assignment.class?.name && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Users className="w-4 h-4" />
              <span>Sinif: {assignment.class.name}</span>
            </div>
          )}

          {submission?.status === 'GRADED' && (
            <div className="bg-purple-50 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-purple-800">Puan</span>
                <span className="text-2xl font-bold text-purple-700">
                  {submission.score}
                  <span className="text-sm font-normal text-purple-500">/100</span>
                </span>
              </div>
              {submission.feedback && (
                <div>
                  <span className="text-sm font-semibold text-purple-800">Ogretmen Yorumu</span>
                  <p className="text-sm text-purple-700 mt-1">{submission.feedback}</p>
                </div>
              )}
            </div>
          )}

          {submission?.submittedAt && (
            <div className="text-xs text-gray-400">
              Teslim tarihi: {formatDateTime(submission.submittedAt)}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-100">
          <button onClick={onClose} className="btn-secondary w-full">
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}

function StudentAssignmentCard({
  assignment,
  onClick,
}: {
  assignment: any;
  onClick: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const status = getAssignmentStatus(assignment);
  const submission = assignment.submissions?.[0];
  const daysLeft = getDaysUntilDue(assignment.dueDate);
  const subjectColor = getSubjectColor(
    assignment.subject?.name || '',
    assignment.subject?.color,
  );

  const isUrgent = status === 'PENDING' && daysLeft >= 0 && daysLeft <= 2;
  const isOverdue = status === 'OVERDUE';

  let cardBorder = 'border-gray-100';
  if (isOverdue) cardBorder = 'border-red-200 bg-red-50/30';
  else if (isUrgent && daysLeft === 0) cardBorder = 'border-red-200 bg-red-50/20';
  else if (isUrgent) cardBorder = 'border-orange-200 bg-orange-50/20';

  return (
    <div
      className={`bg-white rounded-xl shadow-sm border p-5 cursor-pointer hover:shadow-md transition-all ${cardBorder}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: subjectColor }}
            />
            <span className="text-xs font-medium text-gray-500">
              {assignment.subject?.name}
            </span>
          </div>

          <h3 className="text-base font-bold text-gray-900 mb-1">{assignment.title}</h3>

          {assignment.description && (
            <div>
              <p className={`text-sm text-gray-500 ${!expanded ? 'line-clamp-2' : ''}`}>
                {assignment.description}
              </p>
              {assignment.description.length > 100 && (
                <button
                  className="text-xs text-primary-600 hover:text-primary-700 mt-1 font-medium"
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpanded(!expanded);
                  }}
                >
                  {expanded ? 'Daha az' : 'Devamini oku'}
                </button>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 mt-3 text-xs text-gray-400">
            <Calendar className="w-3.5 h-3.5" />
            <span>Son tarih: {formatDate(assignment.dueDate)}</span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <DueDateBadge dueDate={assignment.dueDate} status={status} />
          {submission?.status === 'GRADED' && (
            <div className="text-lg font-bold text-purple-600">
              {submission.score}
              <span className="text-xs font-normal text-gray-400">/100</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StudentView() {
  const { user } = useAuthStore();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssignment, setSelectedAssignment] = useState<any | null>(null);

  const [filterSubject, setFilterSubject] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [sortBy, setSortBy] = useState('dueDate');

  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        let endpoint = '/assignments/student/my';
        if (user?.role === 'PARENT') {
          endpoint = '/assignments/parent/my';
        }
        const { data } = await api.get(endpoint);
        setAssignments(data.data || []);
      } catch {
        toast.error('Odevler yuklenemedi');
      } finally {
        setLoading(false);
      }
    };
    if (user) fetchAssignments();
  }, [user]);

  const subjects = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of assignments) {
      if (a.subject) map.set(a.subject.name, a.subject.name);
    }
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b, 'tr'));
  }, [assignments]);

  const filteredAssignments = useMemo(() => {
    let result = [...assignments];

    if (filterSubject !== 'ALL') {
      result = result.filter((a) => a.subject?.name === filterSubject);
    }

    if (filterStatus !== 'ALL') {
      result = result.filter((a) => getAssignmentStatus(a) === filterStatus);
    }

    result.sort((a, b) => {
      if (sortBy === 'dueDate') {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      if (sortBy === 'subject') {
        return (a.subject?.name || '').localeCompare(b.subject?.name || '', 'tr');
      }
      if (sortBy === 'status') {
        const order = { OVERDUE: 0, PENDING: 1, SUBMITTED: 2, GRADED: 3 };
        return (order[getAssignmentStatus(a) as keyof typeof order] ?? 4) -
               (order[getAssignmentStatus(b) as keyof typeof order] ?? 4);
      }
      return 0;
    });

    return result;
  }, [assignments, filterSubject, filterStatus, sortBy]);

  const stats = useMemo(() => {
    let pending = 0;
    let submitted = 0;
    let overdue = 0;
    let graded = 0;
    for (const a of assignments) {
      const s = getAssignmentStatus(a);
      if (s === 'PENDING') pending++;
      else if (s === 'SUBMITTED') submitted++;
      else if (s === 'OVERDUE') overdue++;
      else if (s === 'GRADED') graded++;
    }
    return { pending, submitted, overdue, graded, total: assignments.length };
  }, [assignments]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card !p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
            <Clock className="w-5 h-5 text-yellow-600" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">{stats.pending}</p>
            <p className="text-xs text-gray-500">Bekleyen</p>
          </div>
        </div>
        <div className="card !p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">{stats.submitted}</p>
            <p className="text-xs text-gray-500">Teslim Edildi</p>
          </div>
        </div>
        <div className="card !p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">{stats.overdue}</p>
            <p className="text-xs text-gray-500">Gec Kaldi</p>
          </div>
        </div>
        <div className="card !p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
            <Star className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">{stats.graded}</p>
            <p className="text-xs text-gray-500">Puanlandi</p>
          </div>
        </div>
      </div>

      <div className="card !p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Filter className="w-4 h-4" />
            <span className="font-medium">Filtre:</span>
          </div>

          <select
            className="input !w-auto min-w-[140px]"
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
          >
            <option value="ALL">Tum Dersler</option>
            {subjects.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <select
            className="input !w-auto min-w-[140px]"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            {Object.entries(STATUS_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>

          <div className="flex items-center gap-2 ml-auto">
            <ArrowUpDown className="w-4 h-4 text-gray-400" />
            <select
              className="input !w-auto min-w-[140px]"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {filteredAssignments.map((a) => (
          <StudentAssignmentCard
            key={a.id}
            assignment={a}
            onClick={() => setSelectedAssignment(a)}
          />
        ))}
      </div>

      {filteredAssignments.length === 0 && (
        <div className="card text-center py-12">
          <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 font-medium">
            {assignments.length === 0 ? 'Henuz odev yok' : 'Filtreye uygun odev bulunamadi'}
          </p>
          {assignments.length > 0 && (
            <button
              onClick={() => { setFilterSubject('ALL'); setFilterStatus('ALL'); }}
              className="text-sm text-primary-600 hover:text-primary-700 mt-2 font-medium"
            >
              Filtreleri temizle
            </button>
          )}
        </div>
      )}

      {selectedAssignment && (
        <AssignmentDetailModal
          assignment={selectedAssignment}
          onClose={() => setSelectedAssignment(null)}
        />
      )}
    </div>
  );
}

function SubmissionsModal({
  assignmentId,
  assignmentTitle,
  onClose,
}: {
  assignmentId: string;
  assignmentTitle: string;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [gradingSubmissionId, setGradingSubmissionId] = useState<string | null>(null);
  const [gradeForm, setGradeForm] = useState({ score: 0, feedback: '' });
  const [gradingLoading, setGradingLoading] = useState(false);

  const fetchSubmissions = useCallback(() => {
    setLoading(true);
    api
      .get(`/assignments/${assignmentId}/submissions`)
      .then(({ data: res }) => setData(res.data))
      .catch(() => toast.error('Teslimler yuklenemedi'))
      .finally(() => setLoading(false));
  }, [assignmentId]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  const handleGradeSubmission = async (submissionId: string) => {
    if (gradeForm.score < 0 || gradeForm.score > 100) {
      toast.error('Not 0-100 arasinda olmalidir');
      return;
    }
    setGradingLoading(true);
    try {
      await api.post(`/assignments/submissions/${submissionId}/grade`, {
        score: Number(gradeForm.score),
        feedback: gradeForm.feedback || undefined,
      });
      toast.success('Odev basariyla notlandi');
      setGradingSubmissionId(null);
      setGradeForm({ score: 0, feedback: '' });
      fetchSubmissions();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Notlandirma basarisiz');
    } finally {
      setGradingLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Teslimler</h2>
            <p className="text-sm text-gray-500">{assignmentTitle}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
            </div>
          ) : !data ? (
            <p className="text-gray-500 text-center py-8">Veri yuklenemedi</p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Users className="w-4 h-4" />
                <span>
                  {data.submissions?.length || 0} / {data.totalStudents || '?'} ogrenci teslim etti
                </span>
              </div>

              {data.submissions?.length === 0 ? (
                <div className="text-center py-8">
                  <ClipboardList className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                  <p className="text-gray-400 text-sm">Henuz teslim yok</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {data.submissions?.map((sub: any) => (
                    <div key={sub.id} className="bg-gray-50 rounded-xl overflow-hidden">
                      <div className="flex items-center justify-between p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                            <User className="w-4 h-4 text-primary-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {sub.studentProfile?.user?.firstName} {sub.studentProfile?.user?.lastName}
                            </p>
                            <p className="text-xs text-gray-400">
                              {sub.submittedAt ? formatDateTime(sub.submittedAt) : 'Teslim edilmedi'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`badge ${
                              sub.status === 'GRADED'
                                ? 'badge-purple'
                                : sub.status === 'SUBMITTED'
                                  ? 'badge-green'
                                  : sub.status === 'LATE'
                                    ? 'badge-orange'
                                    : 'badge-gray'
                            }`}
                          >
                            {sub.status === 'GRADED'
                              ? `${sub.score}/100`
                              : sub.status === 'SUBMITTED'
                                ? 'Teslim Edildi'
                                : sub.status === 'LATE'
                                  ? 'Gec Teslim'
                                  : 'Bekliyor'}
                          </span>

                          {(sub.status === 'SUBMITTED' || sub.status === 'LATE' || sub.status === 'GRADED') && (
                            <button
                              onClick={() => {
                                if (gradingSubmissionId === sub.id) {
                                  setGradingSubmissionId(null);
                                } else {
                                  setGradingSubmissionId(sub.id);
                                  setGradeForm({
                                    score: sub.status === 'GRADED' ? sub.score : 0,
                                    feedback: sub.feedback || '',
                                  });
                                }
                              }}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-purple-50 text-purple-700 rounded-lg text-xs font-medium hover:bg-purple-100 transition-colors"
                            >
                              <Award className="w-3.5 h-3.5" />
                              {sub.status === 'GRADED' ? 'Tekrar Notla' : 'Notla'}
                            </button>
                          )}
                        </div>
                      </div>

                      {gradingSubmissionId === sub.id && (
                        <div className="px-3 pb-3 pt-1 border-t border-gray-100">
                          <div className="bg-white rounded-lg p-3 space-y-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Not (0-100) *
                              </label>
                              <input
                                type="number"
                                className="input !text-sm"
                                min={0}
                                max={100}
                                value={gradeForm.score}
                                onChange={(e) =>
                                  setGradeForm({ ...gradeForm, score: Number(e.target.value) })
                                }
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Geri Bildirim
                              </label>
                              <textarea
                                className="input !text-sm min-h-[60px]"
                                placeholder="Ogretmen yorumu (istege bagli)"
                                value={gradeForm.feedback}
                                onChange={(e) =>
                                  setGradeForm({ ...gradeForm, feedback: e.target.value })
                                }
                              />
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setGradingSubmissionId(null)}
                                className="btn-secondary text-xs px-3 py-1.5"
                              >
                                Iptal
                              </button>
                              <button
                                onClick={() => handleGradeSubmission(sub.id)}
                                disabled={gradingLoading}
                                className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1"
                              >
                                {gradingLoading ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="w-3 h-3" />
                                )}
                                Kaydet
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {sub.status === 'GRADED' && sub.feedback && gradingSubmissionId !== sub.id && (
                        <div className="px-3 pb-3 pt-1 border-t border-gray-100">
                          <p className="text-xs text-gray-500">
                            <span className="font-medium">Geri bildirim:</span> {sub.feedback}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-100">
          <button onClick={onClose} className="btn-secondary w-full">
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateAssignmentModal({
  classes,
  subjects,
  onClose,
  onCreated,
}: {
  classes: { id: string; name: string }[];
  subjects: { id: string; name: string }[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    classId: classes[0]?.id || '',
    subjectId: subjects[0]?.id || '',
    title: '',
    description: '',
    dueDate: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const [termId, setTermId] = useState<string>('');
  const [termsLoading, setTermsLoading] = useState(true);

  useEffect(() => {
    if (classes.length > 0) {
      api
        .get(`/assignments/class/${classes[0].id}`)
        .then(({ data }) => {
          const list = data.data || [];
          if (list.length > 0) {
            setTermId(list[0].termId);
          }
        })
        .catch(() => {  })
        .finally(() => setTermsLoading(false));
    } else {
      setTermsLoading(false);
    }
  }, [classes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.classId || !form.subjectId || !form.dueDate) {
      toast.error('Lutfen tum zorunlu alanlari doldurun');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/assignments', {
        ...form,
        termId: termId || undefined,
        dueDate: new Date(form.dueDate).toISOString(),
      });
      toast.success('Odev olusturuldu');
      onCreated();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message?.[0] || err.response?.data?.message || 'Odev olusturulamadi');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Yeni Odev Olustur</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sinif *</label>
            <select
              className="input"
              value={form.classId}
              onChange={(e) => setForm({ ...form, classId: e.target.value })}
              required
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
              value={form.subjectId}
              onChange={(e) => setForm({ ...form, subjectId: e.target.value })}
              required
            >
              <option value="">Ders secin</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Baslik *</label>
            <input
              className="input"
              placeholder="Odev basligi"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Aciklama</label>
            <textarea
              className="input min-h-[100px]"
              placeholder="Odev aciklamasi (istege bagli)"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Son Teslim Tarihi *</label>
            <input
              type="datetime-local"
              className="input"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              required
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Iptal
            </button>
            <button
              type="submit"
              className="btn-primary flex-1 flex items-center justify-center gap-2"
              disabled={submitting || termsLoading}
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Olustur
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditAssignmentModal({
  assignment,
  onClose,
  onUpdated,
}: {
  assignment: any;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [form, setForm] = useState({
    title: assignment.title || '',
    description: assignment.description || '',
    dueDate: assignment.dueDate
      ? new Date(assignment.dueDate).toISOString().slice(0, 16)
      : '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title) {
      toast.error('Baslik zorunludur');
      return;
    }
    setSubmitting(true);
    try {
      const payload: any = { title: form.title };
      if (form.description) payload.description = form.description;
      if (form.dueDate) payload.dueDate = new Date(form.dueDate).toISOString();

      await api.put(`/assignments/${assignment.id}`, payload);
      toast.success('Odev basariyla guncellendi');
      onUpdated();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Odev guncellenemedi');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Odevi Duzenle</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Baslik *</label>
            <input
              className="input"
              placeholder="Odev basligi"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Aciklama</label>
            <textarea
              className="input min-h-[100px]"
              placeholder="Odev aciklamasi"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Son Teslim Tarihi</label>
            <input
              type="datetime-local"
              className="input"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Iptal
            </button>
            <button
              type="submit"
              className="btn-primary flex-1 flex items-center justify-center gap-2"
              disabled={submitting}
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pencil className="w-4 h-4" />}
              Guncelle
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TeacherAssignmentCard({
  assignment,
  onViewSubmissions,
  onEdit,
  onDelete,
}: {
  assignment: any;
  onViewSubmissions: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const daysLeft = getDaysUntilDue(assignment.dueDate);
  const subjectColor = getSubjectColor(
    assignment.subject?.name || '',
    assignment.subject?.color,
  );
  const submissionCount = assignment._count?.submissions || 0;

  const isOverdue = daysLeft < 0;
  const isUrgent = daysLeft >= 0 && daysLeft <= 2;

  let cardBorder = 'border-gray-100';
  if (isOverdue) cardBorder = 'border-gray-200';

  return (
    <div className={`bg-white rounded-xl shadow-sm border p-5 ${cardBorder}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: subjectColor }}
              />
              <span className="text-xs font-medium text-gray-500">
                {assignment.subject?.name}
              </span>
            </div>
            {assignment.class?.name && (
              <span className="badge badge-blue text-[10px]">{assignment.class.name}</span>
            )}
          </div>

          <h3 className="text-base font-bold text-gray-900 mb-1">{assignment.title}</h3>

          {assignment.description && (
            <p className={`text-sm text-gray-500 ${!expanded ? 'line-clamp-2' : ''}`}>
              {assignment.description}
            </p>
          )}
          {assignment.description && assignment.description.length > 100 && (
            <button
              className="text-xs text-primary-600 hover:text-primary-700 mt-1 font-medium"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? 'Daha az' : 'Devamini oku'}
            </button>
          )}

          <div className="flex items-center gap-4 mt-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <Calendar className="w-3.5 h-3.5" />
              <span>Son: {formatDate(assignment.dueDate)}</span>
            </div>
            {isOverdue ? (
              <span className="badge badge-gray text-[10px]">Sure doldu</span>
            ) : daysLeft === 0 ? (
              <span className="badge badge-red text-[10px] animate-pulse">Bugun son gun!</span>
            ) : isUrgent ? (
              <span className="badge badge-orange text-[10px]">{daysLeft} gun kaldi</span>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <button
            onClick={onViewSubmissions}
            className="flex items-center gap-2 px-3 py-2 bg-primary-50 text-primary-700 rounded-lg text-sm font-medium hover:bg-primary-100 transition-colors"
          >
            <ClipboardList className="w-4 h-4" />
            <span>{submissionCount} teslim</span>
          </button>
          <div className="flex items-center gap-1">
            <button
              onClick={onEdit}
              className="p-1.5 hover:bg-blue-50 rounded-lg transition-colors"
              title="Duzenle"
            >
              <Pencil className="w-4 h-4 text-blue-600" />
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
              title="Sil"
            >
              <Trash2 className="w-4 h-4 text-red-600" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TeacherView() {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; name: string; color?: string }[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submissionsModal, setSubmissionsModal] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [editModal, setEditModal] = useState<any | null>(null);
  const [deleteModal, setDeleteModal] = useState<any | null>(null);

  const [filterSubject, setFilterSubject] = useState('ALL');
  const [filterClass, setFilterClass] = useState('ALL');
  const [sortBy, setSortBy] = useState('dueDate');

  const fetchAssignments = useCallback(async () => {
    try {
      const { data } = await api.get('/assignments/teacher/my');
      setAssignments(data.data || []);
    } catch {
      toast.error('Odevler yuklenemedi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const fetchInit = async () => {
      try {
        const [classRes, subjectRes] = await Promise.all([
          api.get('/classes'),
          api.get('/subjects'),
        ]);
        setClasses(classRes.data.data || []);
        setSubjects(subjectRes.data.data || []);
      } catch { }
    };
    fetchInit();
    fetchAssignments();
  }, [fetchAssignments]);

  const handleDeleteAssignment = async (assignmentId: string) => {
    try {
      await api.delete(`/assignments/${assignmentId}`);
      toast.success('Odev basariyla silindi');
      fetchAssignments();
    } catch {
      toast.error('Odev silinemedi');
    }
  };

  const assignmentSubjects = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of assignments) {
      if (a.subject) map.set(a.subject.name, a.subject.name);
    }
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b, 'tr'));
  }, [assignments]);

  const assignmentClasses = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of assignments) {
      if (a.class) map.set(a.class.name, a.class.name);
    }
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b, 'tr'));
  }, [assignments]);

  const filteredAssignments = useMemo(() => {
    let result = [...assignments];

    if (filterSubject !== 'ALL') {
      result = result.filter((a) => a.subject?.name === filterSubject);
    }
    if (filterClass !== 'ALL') {
      result = result.filter((a) => a.class?.name === filterClass);
    }

    result.sort((a, b) => {
      if (sortBy === 'dueDate') {
        return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
      }
      if (sortBy === 'subject') {
        return (a.subject?.name || '').localeCompare(b.subject?.name || '', 'tr');
      }
      if (sortBy === 'status') {
        return getDaysUntilDue(a.dueDate) - getDaysUntilDue(b.dueDate);
      }
      return 0;
    });

    return result;
  }, [assignments, filterSubject, filterClass, sortBy]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Yeni Odev
        </button>
      </div>

      <div className="card !p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Filter className="w-4 h-4" />
            <span className="font-medium">Filtre:</span>
          </div>

          <select
            className="input !w-auto min-w-[140px]"
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
          >
            <option value="ALL">Tum Siniflar</option>
            {assignmentClasses.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            className="input !w-auto min-w-[140px]"
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
          >
            <option value="ALL">Tum Dersler</option>
            {assignmentSubjects.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <div className="flex items-center gap-2 ml-auto">
            <ArrowUpDown className="w-4 h-4 text-gray-400" />
            <select
              className="input !w-auto min-w-[140px]"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {filteredAssignments.map((a) => (
          <TeacherAssignmentCard
            key={a.id}
            assignment={a}
            onViewSubmissions={() => setSubmissionsModal({ id: a.id, title: a.title })}
            onEdit={() => setEditModal(a)}
            onDelete={() => setDeleteModal(a)}
          />
        ))}
      </div>

      {filteredAssignments.length === 0 && (
        <div className="card text-center py-12">
          <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 font-medium">
            {assignments.length === 0 ? 'Henuz odev olusturmadiniz' : 'Filtreye uygun odev bulunamadi'}
          </p>
          {assignments.length === 0 && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="text-sm text-primary-600 hover:text-primary-700 mt-2 font-medium"
            >
              Ilk odevinizi olusturun
            </button>
          )}
        </div>
      )}

      {showCreateModal && (
        <CreateAssignmentModal
          classes={classes}
          subjects={subjects}
          onClose={() => setShowCreateModal(false)}
          onCreated={fetchAssignments}
        />
      )}

      {submissionsModal && (
        <SubmissionsModal
          assignmentId={submissionsModal.id}
          assignmentTitle={submissionsModal.title}
          onClose={() => setSubmissionsModal(null)}
        />
      )}

      {editModal && (
        <EditAssignmentModal
          assignment={editModal}
          onClose={() => setEditModal(null)}
          onUpdated={fetchAssignments}
        />
      )}

      {deleteModal && (
        <DeleteConfirmModal
          title="Odevi Sil"
          message={`"${deleteModal.title}" odevini silmek istediginizden emin misiniz? Bu islem geri alinamaz.`}
          onConfirm={async () => {
            await handleDeleteAssignment(deleteModal.id);
            setDeleteModal(null);
          }}
          onClose={() => setDeleteModal(null)}
        />
      )}
    </div>
  );
}

export default function AssignmentsPage() {
  const { user } = useAuthStore();
  const isTeacher = user?.role === 'TEACHER';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-primary-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Odevler</h1>
          <p className="text-sm text-gray-500">
            {isTeacher
              ? 'Odevlerinizi yonetin ve teslim durumlarini takip edin'
              : 'Odevlerinizi goruntueleyin ve takip edin'}
          </p>
        </div>
      </div>

      {isTeacher ? <TeacherView /> : <StudentView />}
    </div>
  );
}
