'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { formatDate, dayLabels } from '@/lib/utils';
import {
  Users,
  School,
  BookOpen,
  GraduationCap,
  AlertTriangle,
  Calendar,
  Bell,
  FileText,
  Clock,
  MapPin,
  TrendingUp,
  ClipboardList,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Sparkles,
  BarChart3,
  UserCheck,
  Coffee,
} from 'lucide-react';

interface TimeSlot {
  id: string;
  slotNumber: number;
  startTime: string;
  endTime: string;
}

interface TimetableEntry {
  id: string;
  subjectId: string;
  subject: { name: string; color?: string | null };
  timeSlot: TimeSlot;
  classroom?: { name: string } | null;
  class?: { name: string } | null;
  teacherId?: string | null;
}

interface Announcement {
  id: string;
  title: string;
  category: string;
  createdAt: string;
}

interface Assignment {
  id: string;
  title: string;
  dueDate: string;
  subject: { name: string };
}

interface Grade {
  id: string;
  score: number;
  subject: { name: string };
  category: { name: string };
  createdAt: string;
}

interface ParentChildData {
  id: string;
  firstName: string;
  lastName: string;
  className: string;
  todayClasses: TimetableEntry[];
  timeSlots: TimeSlot[];
  recentGrades: Grade[];
  absenceCount: number;
  pendingAssignments: Assignment[];
  gradeAverage: number;
}

interface ParentData {
  children: ParentChildData[];
  recentAnnouncements: Announcement[];
  isWeekend: boolean;
  dayOfWeek: string;
}

interface AdminData {
  stats: {
    teacherCount: number;
    studentCount: number;
    classCount: number;
    subjectCount: number;
    todayAbsentTeachers: number;
    todaySubstitutions: number;
    todayAttendancePresent: number;
    todayAttendanceAbsent: number;
  };
  recentAnnouncements: Announcement[];
  upcomingEvents: { id: string; title: string; type: string; startDate: string }[];
}

interface TeacherData {
  todayClasses: TimetableEntry[];
  timeSlots: TimeSlot[];
  activeAssignments: number;
  weeklyHours: number;
  pendingDiaryCount: number;
  recentAnnouncements: Announcement[];
  isWeekend: boolean;
  dayOfWeek: string;
}

interface StudentData {
  todayClasses: TimetableEntry[];
  timeSlots: TimeSlot[];
  pendingAssignments: Assignment[];
  recentGrades: Grade[];
  gradeAverage: number;
  absenceCount: number;
  recentAnnouncements: Announcement[];
  isWeekend: boolean;
  dayOfWeek: string;
}

function parseTime(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function getCurrentMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

type SlotStatus = 'past' | 'current' | 'next' | 'future';

function getSlotStatus(
  startTime: string,
  endTime: string,
  currentMinutes: number,
  isFirstFuture: boolean,
): SlotStatus {
  const start = parseTime(startTime);
  const end = parseTime(endTime);
  if (currentMinutes >= start && currentMinutes < end) return 'current';
  if (currentMinutes >= end) return 'past';
  if (isFirstFuture) return 'next';
  return 'future';
}

const SUBJECT_COLORS = [
  { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', dot: 'bg-blue-500' },
  { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  { bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700', dot: 'bg-violet-500' },
  { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500' },
  { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', dot: 'bg-rose-500' },
  { bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-700', dot: 'bg-cyan-500' },
  { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', dot: 'bg-orange-500' },
  { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', dot: 'bg-indigo-500' },
];

function getSubjectColor(subjectName: string, index: number) {
  return SUBJECT_COLORS[index % SUBJECT_COLORS.length];
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="relative">
        <div className="w-12 h-12 border-4 border-primary-100 rounded-full"></div>
        <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
      </div>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, action }: { icon: React.ElementType; title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center">
          <Icon className="w-4.5 h-4.5 text-primary-600" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      </div>
      {action}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-gray-400">
      <FileText className="w-8 h-8 mb-2 opacity-50" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

function AnnouncementList({ announcements }: { announcements: Announcement[] }) {
  if (!announcements || announcements.length === 0) {
    return <EmptyState message="Henuz duyuru yok" />;
  }

  const categoryColors: Record<string, string> = {
    GENERAL: 'badge-blue',
    URGENT: 'badge-red',
    EVENT: 'badge-green',
    EXAM: 'badge-yellow',
  };

  const categoryLabels: Record<string, string> = {
    GENERAL: 'Genel',
    URGENT: 'Acil',
    EVENT: 'Etkinlik',
    EXAM: 'Sinav',
  };

  return (
    <div className="space-y-3">
      {announcements.map((a) => (
        <div
          key={a.id}
          className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group cursor-pointer"
        >
          <div className="w-2 h-2 rounded-full bg-primary-400 mt-2 flex-shrink-0"></div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 group-hover:text-primary-700 transition-colors truncate">
              {a.title}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className={`badge text-[10px] ${categoryColors[a.category] || 'badge-gray'}`}>
                {categoryLabels[a.category] || a.category}
              </span>
              <span className="text-xs text-gray-400">{formatDate(a.createdAt)}</span>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-primary-500 transition-colors flex-shrink-0 mt-1" />
        </div>
      ))}
    </div>
  );
}

interface TimelineProps {
  entries: TimetableEntry[];
  timeSlots: TimeSlot[];
  showClassName?: boolean;
  role: 'STUDENT' | 'TEACHER';
}

function ScheduleTimeline({ entries, timeSlots, showClassName, role }: TimelineProps) {
  const currentMinutes = getCurrentMinutes();
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60000);
    return () => clearInterval(interval);
  }, []);

  const subjectColorMap = useMemo(() => {
    const map = new Map<string, (typeof SUBJECT_COLORS)[number]>();
    const uniqueSubjects = Array.from(new Set(entries.map((e) => e.subject.name)));
    uniqueSubjects.forEach((name, i) => {
      map.set(name, getSubjectColor(name, i));
    });
    return map;
  }, [entries]);

  const schedule = useMemo(() => {
    const entryBySlot = new Map<number, TimetableEntry>();
    entries.forEach((e) => {
      entryBySlot.set(e.timeSlot.slotNumber, e);
    });

    let foundFirstFuture = false;
    return timeSlots.map((slot) => {
      const entry = entryBySlot.get(slot.slotNumber);
      const isFree = !entry;
      const startMin = parseTime(slot.startTime);
      const endMin = parseTime(slot.endTime);
      const isCurrentSlot = currentMinutes >= startMin && currentMinutes < endMin;
      const isPast = currentMinutes >= endMin;
      const isFuture = currentMinutes < startMin;

      let status: SlotStatus = 'future';
      if (isCurrentSlot) {
        status = 'current';
      } else if (isPast) {
        status = 'past';
      } else if (isFuture && !foundFirstFuture) {
        status = 'next';
        foundFirstFuture = true;
      }

      return { slot, entry, isFree, status };
    });
  }, [entries, timeSlots, currentMinutes]);

  function getBreakMinutes(slotIndex: number): number | null {
    if (slotIndex >= schedule.length - 1) return null;
    const currentEnd = parseTime(schedule[slotIndex].slot.endTime);
    const nextStart = parseTime(schedule[slotIndex + 1].slot.startTime);
    const diff = nextStart - currentEnd;
    return diff > 0 ? diff : null;
  }

  if (schedule.length === 0) {
    return <EmptyState message="Bugun ders programi yok" />;
  }

  return (
    <div className="relative">
      <div className="absolute left-[52px] top-2 bottom-2 w-0.5 bg-gray-100"></div>

      <div className="space-y-0">
        {schedule.map((item, index) => {
          const { slot, entry, isFree, status } = item;
          const colors = entry ? subjectColorMap.get(entry.subject.name) : null;
          const breakMin = getBreakMinutes(index);

          return (
            <div key={slot.id}>
              <div className="relative flex items-stretch gap-4">
                <div className="w-[52px] flex-shrink-0 text-right pr-3 py-3">
                  <p className={`text-xs font-semibold ${status === 'past' ? 'text-gray-300' : 'text-gray-600'}`}>
                    {slot.startTime}
                  </p>
                  <p className={`text-[10px] ${status === 'past' ? 'text-gray-200' : 'text-gray-400'}`}>
                    {slot.endTime}
                  </p>
                </div>

                <div className="relative flex items-center justify-center w-5 flex-shrink-0 z-10">
                  <div
                    className={`w-3 h-3 rounded-full border-2 ${
                      status === 'current'
                        ? 'bg-primary-500 border-primary-300 shadow-md shadow-primary-200'
                        : status === 'next'
                          ? 'bg-white border-primary-400'
                          : status === 'past'
                            ? 'bg-gray-200 border-gray-200'
                            : 'bg-white border-gray-300'
                    }`}
                  ></div>
                  {status === 'current' && (
                    <div className="absolute w-5 h-5 rounded-full bg-primary-400 opacity-30 animate-ping"></div>
                  )}
                </div>

                <div className="flex-1 py-1.5">
                  {isFree ? (
                    
                    <div
                      className={`rounded-xl border-2 border-dashed px-4 py-3 transition-all ${
                        status === 'past'
                          ? 'border-gray-100 bg-gray-50/50 opacity-50'
                          : status === 'current'
                            ? 'border-primary-200 bg-primary-50/30'
                            : 'border-gray-200 bg-gray-50/80'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Coffee className={`w-4 h-4 ${status === 'past' ? 'text-gray-300' : 'text-gray-400'}`} />
                        <span className={`text-sm ${status === 'past' ? 'text-gray-300' : 'text-gray-500'}`}>
                          Bos ders
                        </span>
                        {status === 'current' && (
                          <span className="badge badge-blue text-[10px] ml-auto animate-pulse">Su an</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    
                    <div
                      className={`rounded-xl border-2 px-4 py-3 transition-all ${
                        status === 'current'
                          ? `${colors?.bg} ${colors?.border} shadow-lg shadow-primary-100/50 ring-2 ring-primary-300/30`
                          : status === 'past'
                            ? 'bg-gray-50 border-gray-100 opacity-60'
                            : status === 'next'
                              ? `${colors?.bg} ${colors?.border} shadow-md`
                              : `${colors?.bg} ${colors?.border}`
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${status === 'past' ? 'bg-gray-300' : colors?.dot}`}></div>
                            <h4 className={`font-semibold text-sm truncate ${status === 'past' ? 'text-gray-400' : colors?.text}`}>
                              {entry!.subject.name}
                            </h4>
                          </div>
                          <div className="flex items-center gap-3 text-xs mt-1">
                            {showClassName && entry!.class && (
                              <span className={`flex items-center gap-1 ${status === 'past' ? 'text-gray-300' : 'text-gray-500'}`}>
                                <School className="w-3 h-3" />
                                {entry!.class.name}
                              </span>
                            )}
                            {entry!.classroom && (
                              <span className={`flex items-center gap-1 ${status === 'past' ? 'text-gray-300' : 'text-gray-500'}`}>
                                <MapPin className="w-3 h-3" />
                                {entry!.classroom.name}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          {status === 'current' && (
                            <span className="badge badge-blue text-[10px] animate-pulse font-semibold">
                              Su an
                            </span>
                          )}
                          {status === 'next' && (
                            <span className="badge badge-green text-[10px] font-semibold">
                              Siradaki
                            </span>
                          )}
                          {status === 'past' && (
                            <CheckCircle2 className="w-4 h-4 text-gray-300" />
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {breakMin !== null && breakMin >= 5 && (
                <div className="relative flex items-center gap-4 py-0.5">
                  <div className="w-[52px] flex-shrink-0"></div>
                  <div className="w-5 flex-shrink-0 flex justify-center">
                    <div className="w-0.5 h-4 bg-gray-100"></div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5 px-3">
                      <Coffee className="w-3 h-3 text-gray-300" />
                      <span className="text-[10px] text-gray-300 font-medium">
                        {breakMin} dk {breakMin >= 30 ? 'Ogle Arasi' : 'Teneffus'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StudentDashboard() {
  const { user } = useAuthStore();
  const [data, setData] = useState<StudentData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: res } = await api.get('/dashboard/student');
        setData(res.data);
      } catch {
        toast.error('Dashboard verileri yuklenemedi');
      } finally {
        setLoading(false);
      }
    };
    if (user) fetchData();
  }, [user]);

  if (loading) return <LoadingSpinner />;
  if (!data) return <EmptyState message="Veriler yuklenemedi" />;

  const todayLabel = data.dayOfWeek ? dayLabels[data.dayOfWeek] || data.dayOfWeek : '';

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 p-6 text-white shadow-xl">
        <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/5 rounded-full"></div>
        <div className="absolute -right-4 top-12 w-24 h-24 bg-white/5 rounded-full"></div>
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-primary-200" />
            <p className="text-primary-100 text-sm font-medium">
              {data.isWeekend ? 'Iyi tatiller!' : `${todayLabel}`}
            </p>
          </div>
          <h1 className="text-2xl font-bold">
            Merhaba, {user?.firstName || 'Ogrenci'}!
          </h1>
          <p className="text-primary-200 text-sm mt-1">
            {data.isWeekend
              ? 'Bugun hafta sonu, dinlenme zamani.'
              : `Bugun ${data.todayClasses.length} dersin var.`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card !p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{data.absenceCount}</p>
              <p className="text-xs text-gray-500">Devamsizlik</p>
            </div>
          </div>
        </div>

        <div className="card !p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{data.gradeAverage || '-'}</p>
              <p className="text-xs text-gray-500">Not Ort.</p>
            </div>
          </div>
        </div>

        <div className="card !p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{data.pendingAssignments.length}</p>
              <p className="text-xs text-gray-500">Bekleyen Odev</p>
            </div>
          </div>
        </div>

        <div className="card !p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Bell className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{data.recentAnnouncements.length}</p>
              <p className="text-xs text-gray-500">Duyuru</p>
            </div>
          </div>
        </div>
      </div>

      {!data.isWeekend && (
        <div className="card">
          <SectionHeader
            icon={Clock}
            title={`Bugunku Derslerim - ${todayLabel}`}
          />
          <ScheduleTimeline
            entries={data.todayClasses}
            timeSlots={data.timeSlots}
            role="STUDENT"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <SectionHeader icon={Bell} title="Son Duyurular" />
          <AnnouncementList announcements={data.recentAnnouncements} />
        </div>

        <div className="card">
          <SectionHeader icon={ClipboardList} title="Yaklasan Odevler" />
          {data.pendingAssignments.length === 0 ? (
            <EmptyState message="Bekleyen odev yok" />
          ) : (
            <div className="space-y-3">
              {data.pendingAssignments.map((a) => {
                const dueDate = new Date(a.dueDate);
                const now = new Date();
                const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                const isUrgent = diffDays <= 2;
                return (
                  <div
                    key={a.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      isUrgent ? 'border-red-200 bg-red-50/50' : 'border-gray-100 hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isUrgent ? 'bg-red-100' : 'bg-primary-50'}`}>
                      <FileText className={`w-4 h-4 ${isUrgent ? 'text-red-600' : 'text-primary-600'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{a.title}</p>
                      <p className="text-xs text-gray-400">{a.subject.name}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`text-xs font-medium ${isUrgent ? 'text-red-600' : 'text-gray-500'}`}>
                        {formatDate(a.dueDate)}
                      </p>
                      {isUrgent && diffDays > 0 && (
                        <p className="text-[10px] text-red-500 font-medium">{diffDays} gun kaldi</p>
                      )}
                      {diffDays <= 0 && (
                        <p className="text-[10px] text-red-600 font-bold">Bugun!</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {data.recentGrades && data.recentGrades.length > 0 && (
        <div className="card">
          <SectionHeader icon={BarChart3} title="Son Notlar" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.recentGrades.slice(0, 6).map((g) => (
              <div
                key={g.id}
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  g.score >= 70
                    ? 'border-emerald-100 bg-emerald-50/30'
                    : g.score >= 50
                      ? 'border-amber-100 bg-amber-50/30'
                      : 'border-red-100 bg-red-50/30'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                    g.score >= 70
                      ? 'bg-emerald-100 text-emerald-700'
                      : g.score >= 50
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-red-100 text-red-700'
                  }`}
                >
                  {g.score}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{g.subject.name}</p>
                  <p className="text-xs text-gray-400">{g.category.name}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TeacherDashboard() {
  const { user } = useAuthStore();
  const [data, setData] = useState<TeacherData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: res } = await api.get('/dashboard/teacher');
        setData(res.data);
      } catch {
        toast.error('Dashboard verileri yuklenemedi');
      } finally {
        setLoading(false);
      }
    };
    if (user) fetchData();
  }, [user]);

  if (loading) return <LoadingSpinner />;
  if (!data) return <EmptyState message="Veriler yuklenemedi" />;

  const todayLabel = data.dayOfWeek ? dayLabels[data.dayOfWeek] || data.dayOfWeek : '';

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-700 via-primary-800 to-primary-900 p-6 text-white shadow-xl">
        <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/5 rounded-full"></div>
        <div className="absolute -right-4 top-12 w-24 h-24 bg-white/5 rounded-full"></div>
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-primary-200" />
            <p className="text-primary-200 text-sm font-medium">
              {data.isWeekend ? 'Iyi tatiller!' : `${todayLabel}`}
            </p>
          </div>
          <h1 className="text-2xl font-bold">
            Merhaba, {user?.firstName || 'Ogretmen'}!
          </h1>
          <p className="text-primary-300 text-sm mt-1">
            {data.isWeekend
              ? 'Bugun hafta sonu, iyi dinlenmeler.'
              : `Bugun ${data.todayClasses.length} dersiniz var.`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card !p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{data.todayClasses.length}</p>
              <p className="text-xs text-gray-500">Bugun Ders</p>
            </div>
          </div>
        </div>

        <div className="card !p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
              <Clock className="w-5 h-5 text-violet-500" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{data.weeklyHours}</p>
              <p className="text-xs text-gray-500">Haftalik Saat</p>
            </div>
          </div>
        </div>

        <div className="card !p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{data.activeAssignments}</p>
              <p className="text-xs text-gray-500">Aktif Odev</p>
            </div>
          </div>
        </div>

        <div className="card !p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
              <FileText className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{data.pendingDiaryCount}</p>
              <p className="text-xs text-gray-500">Onay Bekleyen</p>
            </div>
          </div>
        </div>
      </div>

      {!data.isWeekend && (
        <div className="card">
          <SectionHeader
            icon={Clock}
            title={`Bugunku Derslerim - ${todayLabel}`}
          />
          <ScheduleTimeline
            entries={data.todayClasses}
            timeSlots={data.timeSlots}
            showClassName
            role="TEACHER"
          />
        </div>
      )}

      <div className="card">
        <SectionHeader icon={Bell} title="Son Duyurular" />
        <AnnouncementList announcements={data.recentAnnouncements} />
      </div>
    </div>
  );
}

function ParentDashboard() {
  const { user } = useAuthStore();
  const [data, setData] = useState<ParentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeChildIndex, setActiveChildIndex] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: res } = await api.get('/dashboard/parent');
        setData(res.data);
      } catch {
        toast.error('Dashboard verileri yuklenemedi');
      } finally {
        setLoading(false);
      }
    };
    if (user) fetchData();
  }, [user]);

  if (loading) return <LoadingSpinner />;
  if (!data) return <EmptyState message="Veriler yuklenemedi" />;

  const todayLabel = data.dayOfWeek ? dayLabels[data.dayOfWeek] || data.dayOfWeek : '';
  const child = data.children[activeChildIndex];

  if (!child) {
    return (
      <div className="space-y-6">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-600 to-primary-800 p-6 text-white shadow-xl">
          <h1 className="text-2xl font-bold">Merhaba, {user?.firstName || 'Veli'}!</h1>
          <p className="text-primary-200 text-sm mt-1">Henuz bagli ogrenci bulunamadi.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-600 via-teal-700 to-teal-800 p-6 text-white shadow-xl">
        <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/5 rounded-full"></div>
        <div className="absolute -right-4 top-12 w-24 h-24 bg-white/5 rounded-full"></div>
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-teal-200" />
            <p className="text-teal-100 text-sm font-medium">
              {data.isWeekend ? 'Iyi tatiller!' : `${todayLabel}`}
            </p>
          </div>
          <h1 className="text-2xl font-bold">
            Merhaba, {user?.firstName || 'Veli'}!
          </h1>
          <p className="text-teal-200 text-sm mt-1">
            {data.children.length === 1
              ? `${child.firstName} ${child.lastName} - ${child.className}`
              : `${data.children.length} ogrenci takip ediyorsunuz.`}
          </p>
        </div>
      </div>

      {data.children.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {data.children.map((c, idx) => (
            <button
              key={c.id}
              onClick={() => setActiveChildIndex(idx)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                idx === activeChildIndex
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              {c.firstName} {c.lastName}
              <span className={`text-xs ${idx === activeChildIndex ? 'text-teal-200' : 'text-gray-400'}`}>
                ({c.className})
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="card !p-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-teal-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{child.firstName} {child.lastName}</h3>
            <p className="text-sm text-gray-500">Sinif: {child.className}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card !p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{child.absenceCount}</p>
              <p className="text-xs text-gray-500">Devamsizlik</p>
            </div>
          </div>
        </div>

        <div className="card !p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{child.gradeAverage || '-'}</p>
              <p className="text-xs text-gray-500">Not Ort.</p>
            </div>
          </div>
        </div>

        <div className="card !p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{child.pendingAssignments.length}</p>
              <p className="text-xs text-gray-500">Bekleyen Odev</p>
            </div>
          </div>
        </div>

        <div className="card !p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">
                {data.isWeekend ? '-' : child.todayClasses.length}
              </p>
              <p className="text-xs text-gray-500">Bugun Ders</p>
            </div>
          </div>
        </div>
      </div>

      {!data.isWeekend && (
        <div className="card">
          <SectionHeader
            icon={Clock}
            title={`Bugunku Dersler - ${todayLabel}`}
          />
          <ScheduleTimeline
            entries={child.todayClasses}
            timeSlots={child.timeSlots}
            role="STUDENT"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <SectionHeader icon={Bell} title="Son Duyurular" />
          <AnnouncementList announcements={data.recentAnnouncements} />
        </div>

        <div className="card">
          <SectionHeader icon={ClipboardList} title="Bekleyen Odevler" />
          {child.pendingAssignments.length === 0 ? (
            <EmptyState message="Bekleyen odev yok" />
          ) : (
            <div className="space-y-3">
              {child.pendingAssignments.map((a) => {
                const dueDate = new Date(a.dueDate);
                const now = new Date();
                const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                const isUrgent = diffDays <= 2;
                return (
                  <div
                    key={a.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      isUrgent ? 'border-red-200 bg-red-50/50' : 'border-gray-100 hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isUrgent ? 'bg-red-100' : 'bg-primary-50'}`}>
                      <FileText className={`w-4 h-4 ${isUrgent ? 'text-red-600' : 'text-primary-600'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{a.title}</p>
                      <p className="text-xs text-gray-400">{a.subject.name}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`text-xs font-medium ${isUrgent ? 'text-red-600' : 'text-gray-500'}`}>
                        {formatDate(a.dueDate)}
                      </p>
                      {isUrgent && diffDays > 0 && (
                        <p className="text-[10px] text-red-500 font-medium">{diffDays} gun kaldi</p>
                      )}
                      {diffDays <= 0 && (
                        <p className="text-[10px] text-red-600 font-bold">Bugun!</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {child.recentGrades && child.recentGrades.length > 0 && (
        <div className="card">
          <SectionHeader icon={BarChart3} title="Son Notlar" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {child.recentGrades.slice(0, 6).map((g) => (
              <div
                key={g.id}
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  g.score >= 70
                    ? 'border-emerald-100 bg-emerald-50/30'
                    : g.score >= 50
                      ? 'border-amber-100 bg-amber-50/30'
                      : 'border-red-100 bg-red-50/30'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                    g.score >= 70
                      ? 'bg-emerald-100 text-emerald-700'
                      : g.score >= 50
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-red-100 text-red-700'
                  }`}
                >
                  {g.score}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{g.subject.name}</p>
                  <p className="text-xs text-gray-400">{g.category.name}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AdminStatCard({
  icon: Icon,
  label,
  value,
  gradient,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  gradient: string;
}) {
  return (
    <div className={`rounded-2xl p-5 text-white shadow-lg ${gradient} hover:shadow-xl transition-shadow`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-3xl font-bold">{value}</p>
          <p className="text-sm font-medium opacity-90 mt-1">{label}</p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center">
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}

function AdminDashboard() {
  const { user } = useAuthStore();
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: res } = await api.get('/dashboard/admin');
        setData(res.data);
      } catch {
        toast.error('Dashboard verileri yuklenemedi');
      } finally {
        setLoading(false);
      }
    };
    if (user) fetchData();
  }, [user]);

  if (loading) return <LoadingSpinner />;
  if (!data) return <EmptyState message="Veriler yuklenemedi" />;

  const stats = data.stats;
  const totalAttendance = stats.todayAttendancePresent + stats.todayAttendanceAbsent;
  const attendanceRate = totalAttendance > 0 ? Math.round((stats.todayAttendancePresent / totalAttendance) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 via-slate-900 to-gray-900 p-6 text-white shadow-xl">
        <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/5 rounded-full"></div>
        <div className="absolute -right-4 top-12 w-24 h-24 bg-white/5 rounded-full"></div>
        <div className="absolute right-16 bottom-4 w-16 h-16 bg-white/5 rounded-full"></div>
        <div className="relative">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-blue-300" />
            <p className="text-gray-300 text-sm font-medium">Yonetim Paneli</p>
          </div>
          <h1 className="text-2xl font-bold">
            Hos geldiniz, {user?.firstName || 'Yonetici'}!
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            {user?.school?.name || 'Okul'} - Genel Bakis
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminStatCard
          icon={Users}
          label="Ogretmen"
          value={stats.teacherCount}
          gradient="bg-gradient-to-br from-blue-500 to-blue-700"
        />
        <AdminStatCard
          icon={GraduationCap}
          label="Ogrenci"
          value={stats.studentCount}
          gradient="bg-gradient-to-br from-emerald-500 to-emerald-700"
        />
        <AdminStatCard
          icon={School}
          label="Sinif"
          value={stats.classCount}
          gradient="bg-gradient-to-br from-violet-500 to-violet-700"
        />
        <AdminStatCard
          icon={BookOpen}
          label="Ders"
          value={stats.subjectCount}
          gradient="bg-gradient-to-br from-amber-500 to-amber-700"
        />
      </div>

      {stats.todayAbsentTeachers > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center gap-3 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-yellow-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-yellow-800">
              Bugun <strong>{stats.todayAbsentTeachers}</strong> ogretmen gelmiyor.
            </p>
            {stats.todaySubstitutions > 0 && (
              <p className="text-xs text-yellow-600 mt-0.5">
                {stats.todaySubstitutions} vekil atama yapildi.
              </p>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <SectionHeader icon={UserCheck} title="Bugunku Yoklama Ozeti" />
          {totalAttendance === 0 ? (
            <EmptyState message="Henuz yoklama girilmedi" />
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Yoklama Orani</span>
                <span className="text-2xl font-bold text-gray-900">{attendanceRate}%</span>
              </div>
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-500"
                  style={{ width: `${attendanceRate}%` }}
                ></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <div>
                    <p className="text-lg font-bold text-emerald-700">{stats.todayAttendancePresent}</p>
                    <p className="text-xs text-emerald-600">Gelen</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg">
                  <XCircle className="w-5 h-5 text-red-600" />
                  <div>
                    <p className="text-lg font-bold text-red-700">{stats.todayAttendanceAbsent}</p>
                    <p className="text-xs text-red-600">Gelmeyen</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <SectionHeader icon={Users} title="Bugunku Vekil Atamalar" />
          {stats.todaySubstitutions === 0 && stats.todayAbsentTeachers === 0 ? (
            <EmptyState message="Bugun vekil atamasi yok" />
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-orange-50 rounded-xl border border-orange-100">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-5 h-5 text-orange-500" />
                    <span className="text-sm font-medium text-orange-700">Gelmeyen</span>
                  </div>
                  <p className="text-3xl font-bold text-orange-700">{stats.todayAbsentTeachers}</p>
                  <p className="text-xs text-orange-500 mt-1">ogretmen</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <div className="flex items-center gap-2 mb-2">
                    <UserCheck className="w-5 h-5 text-blue-500" />
                    <span className="text-sm font-medium text-blue-700">Vekil</span>
                  </div>
                  <p className="text-3xl font-bold text-blue-700">{stats.todaySubstitutions}</p>
                  <p className="text-xs text-blue-500 mt-1">atama yapildi</p>
                </div>
              </div>
              {stats.todayAbsentTeachers > stats.todaySubstitutions && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-xs text-red-700 font-medium">
                    {stats.todayAbsentTeachers - stats.todaySubstitutions} ogretmen icin henuz vekil atanmadi!
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <SectionHeader icon={Bell} title="Son Duyurular" />
          <AnnouncementList announcements={data.recentAnnouncements} />
        </div>

        <div className="card">
          <SectionHeader icon={Calendar} title="Yaklasan Etkinlikler" />
          {!data.upcomingEvents || data.upcomingEvents.length === 0 ? (
            <EmptyState message="Yaklasan etkinlik yok" />
          ) : (
            <div className="space-y-3">
              {data.upcomingEvents.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-5 h-5 text-primary-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 group-hover:text-primary-700 transition-colors truncate">
                      {e.title}
                    </p>
                    <p className="text-xs text-gray-400">{formatDate(e.startDate)}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-primary-500 transition-colors flex-shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();

  if (!user) {
    return <LoadingSpinner />;
  }

  if (user.role === 'STUDENT') {
    return <StudentDashboard />;
  }

  if (user.role === 'TEACHER') {
    return <TeacherDashboard />;
  }

  if (user.role === 'SCHOOL_ADMIN' || user.role === 'SUPER_ADMIN') {
    return <AdminDashboard />;
  }

  if (user.role === 'PARENT') {
    return <ParentDashboard />;
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-600 to-primary-800 p-6 text-white shadow-xl">
        <h1 className="text-2xl font-bold">Hos geldiniz!</h1>
        <p className="text-primary-200 text-sm mt-1">Sol menuden islemlerinize ulasabilirsiniz.</p>
      </div>
    </div>
  );
}
