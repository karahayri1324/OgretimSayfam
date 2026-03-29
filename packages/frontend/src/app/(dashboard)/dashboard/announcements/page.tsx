'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import {
  Plus,
  Pin,
  Bell,
  Loader2,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  X,
  Megaphone,
  AlertTriangle,
  Calendar,
  BookOpen,
  Eye,
  Pencil,
  Trash2,
  Clock,
  Users,
} from 'lucide-react';
import { formatRelativeDate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Announcement {
  id: string;
  title: string;
  content: string;
  category: string;
  isPinned: boolean;
  isRead?: boolean;
  publishAt?: string | null;
  createdAt: string;
  authorId?: string;
  author?: { id?: string; firstName: string; lastName: string; role: string };
  targetClasses?: { class: { id: string; name: string } }[];
  targetStudents?: { studentProfileId: string }[];
  _count?: { reads: number };
}

interface ClassOption {
  id: string;
  name: string;
}

interface StudentOption {
  id: string;
  firstName: string;
  lastName: string;
  studentProfile?: { id: string };
}

const categoryConfig: Record<string, { label: string; color: string; bgClass: string; textClass: string; icon: React.ReactNode }> = {
  GENERAL: {
    label: 'Genel',
    color: 'badge-gray',
    bgClass: 'bg-gray-100',
    textClass: 'text-gray-700',
    icon: <Megaphone className="w-3.5 h-3.5" />,
  },
  EXAM: {
    label: 'Sinav',
    color: 'badge-red',
    bgClass: 'bg-red-50',
    textClass: 'text-red-700',
    icon: <BookOpen className="w-3.5 h-3.5" />,
  },
  EVENT: {
    label: 'Etkinlik',
    color: 'badge-purple',
    bgClass: 'bg-purple-50',
    textClass: 'text-purple-700',
    icon: <Calendar className="w-3.5 h-3.5" />,
  },
  URGENT: {
    label: 'Acil',
    color: 'badge-red',
    bgClass: 'bg-red-50',
    textClass: 'text-red-700',
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
  },
  HOLIDAY: {
    label: 'Tatil',
    color: 'badge-green',
    bgClass: 'bg-green-50',
    textClass: 'text-green-700',
    icon: <Calendar className="w-3.5 h-3.5" />,
  },
};

const ALL_CATEGORIES = ['GENERAL', 'EXAM', 'EVENT', 'URGENT'] as const;

type TargetTab = 'all' | 'classes' | 'students';

function CategoryBadge({ category }: { category: string }) {
  const cfg = categoryConfig[category] || categoryConfig.GENERAL;
  const isUrgent = category === 'URGENT';

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.bgClass} ${cfg.textClass} ${isUrgent ? 'animate-pulse ring-2 ring-red-300' : ''}`}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

function AnnouncementCard({
  announcement,
  isExpanded,
  onToggle,
  onMarkRead,
  onEdit,
  onDelete,
  canManage,
}: {
  announcement: Announcement;
  isExpanded: boolean;
  onToggle: () => void;
  onMarkRead: (id: string) => void;
  onEdit?: (announcement: Announcement) => void;
  onDelete?: (announcement: Announcement) => void;
  canManage: boolean;
}) {
  const a = announcement;
  const isUnread = a.isRead === false;
  const isScheduled = a.publishAt && new Date(a.publishAt) > new Date();

  const handleClick = () => {
    onToggle();
    if (isUnread) {
      onMarkRead(a.id);
    }
  };

  return (
    <div
      className={`
        relative rounded-xl border transition-all duration-200 cursor-pointer
        ${a.isPinned ? 'border-primary-200 bg-gradient-to-r from-primary-50/60 to-blue-50/40 shadow-md' : 'border-gray-100 bg-white shadow-sm hover:shadow-md'}
        ${isUnread ? 'border-l-4 border-l-primary-500' : ''}
        ${isExpanded ? 'ring-2 ring-primary-200' : ''}
        ${isScheduled ? 'opacity-75' : ''}
      `}
      onClick={handleClick}
    >
      {a.isPinned && (
        <div className="absolute -top-0 -right-0 bg-primary-500 text-white px-2.5 py-1 rounded-bl-lg rounded-tr-xl text-xs font-medium flex items-center gap-1">
          <Pin className="w-3 h-3" />
          Sabitlendi
        </div>
      )}

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {isUnread && (
              <div className="mt-1.5 flex-shrink-0">
                <span className="block w-2.5 h-2.5 rounded-full bg-primary-500 ring-2 ring-primary-200" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h3
                  className={`text-base ${isUnread ? 'font-bold text-gray-900' : 'font-medium text-gray-700'} truncate`}
                >
                  {a.title}
                </h3>
                <CategoryBadge category={a.category} />
                {isScheduled && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
                    <Clock className="w-3 h-3" />
                    Zamanlanmis
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
                <span className="font-medium text-gray-500">
                  {a.author?.firstName} {a.author?.lastName}
                </span>
                <span>{formatRelativeDate(a.createdAt)}</span>
                {isScheduled && a.publishAt && (
                  <span className="text-amber-600 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(a.publishAt).toLocaleString('tr-TR')}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  {a._count?.reads || 0}
                </span>
                {a.targetClasses && a.targetClasses.length > 0 && (
                  <span className="text-primary-500">
                    {a.targetClasses.map((tc) => tc.class.name).join(', ')}
                  </span>
                )}
                {a.targetStudents && a.targetStudents.length > 0 && (
                  <span className="text-green-600 flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {a.targetStudents.length} ogrenci
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0 mt-1">
            {canManage && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit?.(a);
                  }}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-primary-600 hover:bg-primary-50 transition-all"
                  title="Duzenle"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete?.(a);
                  }}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
                  title="Sil"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
            <div className="text-gray-400 ml-1">
              {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          </div>
        </div>

        {!isExpanded && (
          <p className="mt-2 text-sm text-gray-500 line-clamp-2 pl-0">
            {a.content}
          </p>
        )}

        {isExpanded && (
          <div className="mt-4 pt-3 border-t border-gray-100">
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{a.content}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function CreateAnnouncementModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    title: '',
    content: '',
    category: 'GENERAL',
    isPinned: false,
    targetClassIds: [] as string[],
    targetStudentIds: [] as string[],
    publishAt: '',
  });
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [targetTab, setTargetTab] = useState<TargetTab>('all');
  const [scheduleEnabled, setScheduleEnabled] = useState(false);

  useEffect(() => {
    api
      .get('/classes')
      .then(({ data }) => setClasses(data.data || []))
      .catch(() => {  });
  }, []);

  useEffect(() => {
    if (targetTab === 'students' && students.length === 0) {
      setLoadingStudents(true);
      api
        .get('/users?role=STUDENT')
        .then(({ data }) => setStudents(data.data || []))
        .catch(() => {  })
        .finally(() => setLoadingStudents(false));
    }
  }, [targetTab, students.length]);

  const toggleClass = (id: string) => {
    setForm((prev) => ({
      ...prev,
      targetClassIds: prev.targetClassIds.includes(id)
        ? prev.targetClassIds.filter((c) => c !== id)
        : [...prev.targetClassIds, id],
    }));
  };

  const toggleStudent = (profileId: string) => {
    setForm((prev) => ({
      ...prev,
      targetStudentIds: prev.targetStudentIds.includes(profileId)
        ? prev.targetStudentIds.filter((s) => s !== profileId)
        : [...prev.targetStudentIds, profileId],
    }));
  };

  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return students;
    const q = studentSearch.toLowerCase();
    return students.filter(
      (s) =>
        s.firstName.toLowerCase().includes(q) ||
        s.lastName.toLowerCase().includes(q),
    );
  }, [students, studentSearch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload: any = {
        title: form.title,
        content: form.content,
        category: form.category,
        isPinned: form.isPinned,
      };

      if (targetTab === 'classes' && form.targetClassIds.length > 0) {
        payload.targetClassIds = form.targetClassIds;
      }
      if (targetTab === 'students' && form.targetStudentIds.length > 0) {
        payload.targetStudentIds = form.targetStudentIds;
      }
      if (scheduleEnabled && form.publishAt) {
        payload.publishAt = new Date(form.publishAt).toISOString();
      }

      await api.post('/announcements', payload);
      toast.success('Duyuru basariyla olusturuldu');
      onCreated();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message?.[0] || 'Duyuru olusturulamadi');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
              <Megaphone className="w-5 h-5 text-primary-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Yeni Duyuru</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Baslik</label>
            <input
              className="input"
              placeholder="Duyuru basligini girin..."
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Icerik</label>
            <textarea
              className="input min-h-[140px] resize-y"
              placeholder="Duyuru icerigini yazin..."
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Kategori</label>
            <div className="grid grid-cols-2 gap-2">
              {ALL_CATEGORIES.map((cat) => {
                const cfg = categoryConfig[cat];
                const isSelected = form.category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setForm({ ...form, category: cat })}
                    className={`
                      flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 text-sm font-medium transition-all
                      ${isSelected ? `${cfg.bgClass} ${cfg.textClass} border-current` : 'border-gray-200 text-gray-500 hover:border-gray-300'}
                    `}
                  >
                    {cfg.icon}
                    {cfg.label}
                    {cat === 'URGENT' && isSelected && (
                      <span className="ml-auto w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
            <div className="flex items-center gap-2">
              <Pin className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Duyuruyu Sabitle</span>
            </div>
            <button
              type="button"
              onClick={() => setForm({ ...form, isPinned: !form.isPinned })}
              className={`
                relative w-11 h-6 rounded-full transition-colors duration-200
                ${form.isPinned ? 'bg-primary-500' : 'bg-gray-300'}
              `}
            >
              <span
                className={`
                  absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200
                  ${form.isPinned ? 'translate-x-5' : 'translate-x-0'}
                `}
              />
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Hedef</label>
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-3">
              {([
                { key: 'all' as TargetTab, label: 'Tum Okul' },
                { key: 'classes' as TargetTab, label: 'Siniflar' },
                { key: 'students' as TargetTab, label: 'Ogrenciler' },
              ]).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setTargetTab(tab.key);
                    if (tab.key === 'all') {
                      setForm((prev) => ({ ...prev, targetClassIds: [], targetStudentIds: [] }));
                    } else if (tab.key === 'classes') {
                      setForm((prev) => ({ ...prev, targetStudentIds: [] }));
                    } else {
                      setForm((prev) => ({ ...prev, targetClassIds: [] }));
                    }
                  }}
                  className={`
                    flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all
                    ${targetTab === tab.key ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}
                  `}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {targetTab === 'classes' && classes.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {classes.map((cls) => {
                  const isSelected = form.targetClassIds.includes(cls.id);
                  return (
                    <button
                      key={cls.id}
                      type="button"
                      onClick={() => toggleClass(cls.id)}
                      className={`
                        px-3 py-1.5 rounded-lg text-sm font-medium border transition-all
                        ${isSelected ? 'bg-primary-50 text-primary-700 border-primary-300' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}
                      `}
                    >
                      {cls.name}
                    </button>
                  );
                })}
              </div>
            )}

            {targetTab === 'students' && (
              <div>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Ogrenci ara..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="input pl-10"
                  />
                </div>
                {loadingStudents ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                  </div>
                ) : (
                  <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                    {filteredStudents.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-4">Ogrenci bulunamadi</p>
                    ) : (
                      filteredStudents.map((s) => {
                        const profileId = s.studentProfile?.id;
                        if (!profileId) return null;
                        const isSelected = form.targetStudentIds.includes(profileId);
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => toggleStudent(profileId)}
                            className={`
                              w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left transition-all
                              ${isSelected ? 'bg-primary-50 text-primary-700' : 'hover:bg-gray-50 text-gray-700'}
                            `}
                          >
                            <span className={`
                              w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0
                              ${isSelected ? 'bg-primary-500 border-primary-500 text-white' : 'border-gray-300'}
                            `}>
                              {isSelected && (
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                              )}
                            </span>
                            <span className="font-medium">{s.firstName} {s.lastName}</span>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
                {form.targetStudentIds.length > 0 && (
                  <p className="text-xs text-primary-600 mt-2 font-medium">
                    {form.targetStudentIds.length} ogrenci secildi
                  </p>
                )}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Zamanla</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setScheduleEnabled(!scheduleEnabled);
                  if (scheduleEnabled) setForm((prev) => ({ ...prev, publishAt: '' }));
                }}
                className={`
                  relative w-11 h-6 rounded-full transition-colors duration-200
                  ${scheduleEnabled ? 'bg-primary-500' : 'bg-gray-300'}
                `}
              >
                <span
                  className={`
                    absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200
                    ${scheduleEnabled ? 'translate-x-5' : 'translate-x-0'}
                  `}
                />
              </button>
            </div>
            {scheduleEnabled && (
              <div className="mt-2">
                <input
                  type="datetime-local"
                  className="input"
                  value={form.publishAt}
                  onChange={(e) => setForm({ ...form, publishAt: e.target.value })}
                />
                <p className="text-xs text-gray-400 mt-1">Duyuru belirtilen tarihte otomatik yayinlanir.</p>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Iptal
            </button>
            <button type="submit" disabled={submitting} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Megaphone className="w-4 h-4" />}
              {scheduleEnabled && form.publishAt ? 'Zamanla' : 'Yayinla'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditAnnouncementModal({
  announcement,
  onClose,
  onUpdated,
}: {
  announcement: Announcement;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [form, setForm] = useState({
    title: announcement.title,
    content: announcement.content,
    isPinned: announcement.isPinned,
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.put(`/announcements/${announcement.id}`, form);
      toast.success('Duyuru basariyla guncellendi');
      onUpdated();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message?.[0] || 'Duyuru guncellenemedi');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
              <Pencil className="w-5 h-5 text-primary-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Duyuru Duzenle</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Baslik</label>
            <input
              className="input"
              placeholder="Duyuru basligini girin..."
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Icerik</label>
            <textarea
              className="input min-h-[140px] resize-y"
              placeholder="Duyuru icerigini yazin..."
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              required
            />
          </div>

          <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
            <div className="flex items-center gap-2">
              <Pin className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Duyuruyu Sabitle</span>
            </div>
            <button
              type="button"
              onClick={() => setForm({ ...form, isPinned: !form.isPinned })}
              className={`
                relative w-11 h-6 rounded-full transition-colors duration-200
                ${form.isPinned ? 'bg-primary-500' : 'bg-gray-300'}
              `}
            >
              <span
                className={`
                  absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200
                  ${form.isPinned ? 'translate-x-5' : 'translate-x-0'}
                `}
              />
            </button>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Iptal
            </button>
            <button type="submit" disabled={submitting} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pencil className="w-4 h-4" />}
              Guncelle
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteAnnouncementModal({
  announcement,
  onClose,
  onDeleted,
}: {
  announcement: Announcement;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/announcements/${announcement.id}`);
      toast.success('Duyuru basariyla silindi');
      onDeleted();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message?.[0] || 'Duyuru silinemedi');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-red-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">Duyuru Sil</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="text-sm text-gray-600">
            <p className="mb-2">
              Bu duyuruyu silmek istediginizden emin misiniz?
            </p>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="font-semibold text-gray-900">{announcement.title}</p>
              <p className="text-gray-500 mt-1 line-clamp-2">{announcement.content}</p>
            </div>
            <p className="mt-3 text-red-600 text-xs font-medium">
              Bu islem geri alinamaz.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Iptal
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-all"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Sil
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AnnouncementsPage() {
  const { user } = useAuthStore();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [deletingAnnouncement, setDeletingAnnouncement] = useState<Announcement | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const canCreate = ['SCHOOL_ADMIN', 'TEACHER'].includes(user?.role || '');
  const isAdmin = ['SCHOOL_ADMIN', 'SUPER_ADMIN'].includes(user?.role || '');
  const canManageAnnouncement = (announcement: Announcement): boolean => {
    if (isAdmin) return true;
    if (user?.role === 'TEACHER') {
      return announcement.authorId === user?.id || announcement.author?.id === user?.id;
    }
    return false;
  };

  const fetchAnnouncements = useCallback(async () => {
    try {
      const { data } = await api.get('/announcements');
      const list: Announcement[] = data.data || [];
      setAnnouncements(list);
      
      const readSet = new Set<string>();
      list.forEach((a) => {
        if (a.isRead) readSet.add(a.id);
      });
      setReadIds(readSet);
    } catch {
      toast.error('Duyurular yuklenemedi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const markAsRead = useCallback(
    async (id: string) => {
      if (readIds.has(id)) return;
      setReadIds((prev) => new Set(prev).add(id));
      try {
        await api.post(`/announcements/${id}/read`);
      } catch { }
    },
    [readIds],
  );

  const filtered = useMemo(() => {
    let list = announcements;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.content.toLowerCase().includes(q) ||
          `${a.author?.firstName} ${a.author?.lastName}`.toLowerCase().includes(q),
      );
    }

    if (categoryFilter) {
      list = list.filter((a) => a.category === categoryFilter);
    }

    return list;
  }, [announcements, searchQuery, categoryFilter]);

  const pinnedAnnouncements = useMemo(() => filtered.filter((a) => a.isPinned), [filtered]);
  const regularAnnouncements = useMemo(() => filtered.filter((a) => !a.isPinned), [filtered]);

  const unreadCount = useMemo(() => announcements.filter((a) => !readIds.has(a.id) && a.isRead === false).length, [announcements, readIds]);

  const getDisplayAnnouncement = (a: Announcement): Announcement => ({
    ...a,
    isRead: readIds.has(a.id) || a.isRead === true,
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Duyurular</h1>
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
          <span className="text-sm text-gray-400">Duyurular yukleniyor...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
            <Bell className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Duyurular</h1>
            <p className="text-sm text-gray-400">
              {announcements.length} duyuru
              {unreadCount > 0 && (
                <span className="ml-2 text-primary-600 font-medium">{unreadCount} okunmamis</span>
              )}
            </p>
          </div>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center gap-2 shadow-lg shadow-primary-200"
          >
            <Plus className="w-4 h-4" /> Yeni Duyuru
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Duyuru ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-10"
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

        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <button
            onClick={() => setCategoryFilter(null)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              categoryFilter === null
                ? 'bg-primary-50 text-primary-700 border-primary-300'
                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
            }`}
          >
            Tumu
          </button>
          {ALL_CATEGORIES.map((cat) => {
            const cfg = categoryConfig[cat];
            const isActive = categoryFilter === cat;
            return (
              <button
                key={cat}
                onClick={() => setCategoryFilter(isActive ? null : cat)}
                className={`
                  flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all
                  ${isActive ? `${cfg.bgClass} ${cfg.textClass} border-current` : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}
                `}
              >
                {cfg.icon}
                {cfg.label}
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card text-center py-16">
          <Bell className="w-14 h-14 mx-auto mb-4 text-gray-200" />
          <p className="text-gray-400 text-base font-medium">
            {searchQuery || categoryFilter ? 'Aramanizla eslesen duyuru bulunamadi' : 'Henuz duyuru yok'}
          </p>
          {(searchQuery || categoryFilter) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setCategoryFilter(null);
              }}
              className="mt-3 text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              Filtreleri temizle
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {pinnedAnnouncements.length > 0 && (
            <>
              <div className="flex items-center gap-2 text-xs font-semibold text-primary-600 uppercase tracking-wider">
                <Pin className="w-3.5 h-3.5" />
                Sabitlenen Duyurular
              </div>
              <div className="space-y-3">
                {pinnedAnnouncements.map((a) => (
                  <AnnouncementCard
                    key={a.id}
                    announcement={getDisplayAnnouncement(a)}
                    isExpanded={expandedId === a.id}
                    onToggle={() => setExpandedId(expandedId === a.id ? null : a.id)}
                    onMarkRead={markAsRead}
                    onEdit={(ann) => setEditingAnnouncement(ann)}
                    onDelete={(ann) => setDeletingAnnouncement(ann)}
                    canManage={canManageAnnouncement(a)}
                  />
                ))}
              </div>
            </>
          )}

          {regularAnnouncements.length > 0 && (
            <>
              {pinnedAnnouncements.length > 0 && (
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mt-6">
                  <Bell className="w-3.5 h-3.5" />
                  Diger Duyurular
                </div>
              )}
              <div className="space-y-3">
                {regularAnnouncements.map((a) => (
                  <AnnouncementCard
                    key={a.id}
                    announcement={getDisplayAnnouncement(a)}
                    isExpanded={expandedId === a.id}
                    onToggle={() => setExpandedId(expandedId === a.id ? null : a.id)}
                    onMarkRead={markAsRead}
                    onEdit={(ann) => setEditingAnnouncement(ann)}
                    onDelete={(ann) => setDeletingAnnouncement(ann)}
                    canManage={canManageAnnouncement(a)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {showModal && (
        <CreateAnnouncementModal
          onClose={() => setShowModal(false)}
          onCreated={fetchAnnouncements}
        />
      )}

      {editingAnnouncement && (
        <EditAnnouncementModal
          announcement={editingAnnouncement}
          onClose={() => setEditingAnnouncement(null)}
          onUpdated={fetchAnnouncements}
        />
      )}

      {deletingAnnouncement && (
        <DeleteAnnouncementModal
          announcement={deletingAnnouncement}
          onClose={() => setDeletingAnnouncement(null)}
          onDeleted={fetchAnnouncements}
        />
      )}
    </div>
  );
}
