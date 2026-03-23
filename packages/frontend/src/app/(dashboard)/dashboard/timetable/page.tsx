'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { dayLabels } from '@/lib/utils';
import toast from 'react-hot-toast';
import { Calendar, Settings, Wand2, Eye, Users, BookOpen, Clock, AlertCircle, CheckCircle, Loader2, RefreshCw, Trash2, Plus, Download, DoorOpen } from 'lucide-react';

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
const DAY_NAMES_TR = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];

type Tab = 'view' | 'assignments' | 'generate';

export default function TimetablePage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<Tab>('view');
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'SCHOOL_ADMIN';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Ders Programı</h1>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('view')}
            className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'view'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Eye className="w-4 h-4" />
            Görüntüle
          </button>
          {isAdmin && (
            <>
              <button
                onClick={() => setActiveTab('assignments')}
                className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === 'assignments'
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Users className="w-4 h-4" />
                Öğretmen Atamaları
              </button>
              <button
                onClick={() => setActiveTab('generate')}
                className={`py-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === 'generate'
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Wand2 className="w-4 h-4" />
                Otomatik Oluştur (FET)
              </button>
            </>
          )}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'view' && <TimetableView />}
      {activeTab === 'assignments' && isAdmin && <AssignmentsManager />}
      {activeTab === 'generate' && isAdmin && <FetGenerator />}
    </div>
  );
}

// ==================== DERS PROGRAMI GÖRÜNTÜLEME ====================

// Maps JS getDay() (0=Sun) to our DAYS array index (0=Mon)
const JS_DAY_TO_DAYS_INDEX: Record<number, number> = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4 };

/**
 * Parse "HH:MM" to minutes since midnight for time comparisons.
 */
function parseTimeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Determine if a hex color is "dark" so we can pick white or dark text.
 */
function isColorDark(hex: string): boolean {
  const c = hex.replace('#', '');
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  // Perceived brightness formula
  return (r * 299 + g * 587 + b * 114) / 1000 < 150;
}

function TimetableView() {
  const { user } = useAuthStore();
  const [entries, setEntries] = useState<any[]>([]);
  const [timeSlots, setTimeSlots] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [viewMode, setViewMode] = useState<'class' | 'teacher'>('class');
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());

  // Update current time every 30 seconds for the live indicator
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const { data: tsData } = await api.get('/timetable/time-slots');
        setTimeSlots(tsData.data || []);

        if (user?.role === 'TEACHER' && user.teacherProfileId) {
          const { data } = await api.get(`/timetable/teacher/${user.teacherProfileId}`);
          setEntries(data.data || []);
          setViewMode('teacher');
        } else if (user?.role === 'STUDENT' && user.studentClassId) {
          const { data } = await api.get(`/timetable/class/${user.studentClassId}`);
          setEntries(data.data || []);
        } else {
          // Admin - load classes and teachers
          const [clsRes, usersRes] = await Promise.all([
            api.get('/classes'),
            api.get('/users?role=TEACHER&limit=100'),
          ]);
          setClasses(clsRes.data.data || []);
          setTeachers(usersRes.data.data || []);
          if (clsRes.data.data?.length > 0) {
            setSelectedClassId(clsRes.data.data[0].id);
          }
        }
      } catch (err: any) {
        toast.error('Veri yüklenemedi');
      } finally {
        setLoading(false);
      }
    };
    if (user) init();
  }, [user]);

  useEffect(() => {
    if (viewMode === 'class' && selectedClassId) {
      api.get(`/timetable/class/${selectedClassId}`).then(({ data }) => setEntries(data.data || []));
    }
  }, [selectedClassId, viewMode]);

  useEffect(() => {
    if (viewMode === 'teacher' && selectedTeacherId) {
      api.get(`/timetable/teacher/${selectedTeacherId}`).then(({ data }) => setEntries(data.data || []));
    }
  }, [selectedTeacherId, viewMode]);

  const getEntry = (day: string, slotId: string) =>
    entries.find((e: any) => e.dayOfWeek === day && e.timeSlotId === slotId);

  // ---- Current time helpers ----
  const todayDayIndex = JS_DAY_TO_DAYS_INDEX[now.getDay()] ?? -1; // -1 = weekend
  const todayDAY = DAYS[todayDayIndex] as string | undefined;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  /**
   * For a given time slot, return the vertical percentage (0-100) of the red
   * current-time indicator line, or null if current time is outside the slot.
   */
  const currentTimePercent = (slot: any): number | null => {
    if (todayDayIndex === -1) return null;
    const start = parseTimeToMinutes(slot.startTime);
    const end = parseTimeToMinutes(slot.endTime);
    if (nowMinutes < start || nowMinutes > end) return null;
    return ((nowMinutes - start) / (end - start)) * 100;
  };

  /**
   * Check whether a given day + slot is the "current" class (i.e. happening right now).
   */
  const isCurrentSlot = (day: string, slot: any): boolean => {
    if (day !== todayDAY) return false;
    const start = parseTimeToMinutes(slot.startTime);
    const end = parseTimeToMinutes(slot.endTime);
    return nowMinutes >= start && nowMinutes <= end;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'SCHOOL_ADMIN';

  return (
    <div className="space-y-4">
      {/* Controls */}
      {isAdmin && (
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('class')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                viewMode === 'class' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'
              }`}
            >
              <BookOpen className="w-4 h-4 inline mr-1" />
              Sınıf
            </button>
            <button
              onClick={() => {
                setViewMode('teacher');
                if (teachers.length > 0 && !selectedTeacherId) {
                  setSelectedTeacherId(teachers[0].teacherProfile?.id || '');
                }
              }}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                viewMode === 'teacher' ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'
              }`}
            >
              <Users className="w-4 h-4 inline mr-1" />
              Öğretmen
            </button>
          </div>

          {viewMode === 'class' && classes.length > 0 && (
            <select
              className="input w-48"
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
            >
              {classes.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}

          {viewMode === 'teacher' && teachers.length > 0 && (
            <select
              className="input w-56"
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
            >
              <option value="">Öğretmen seçin</option>
              {teachers.map((t: any) => (
                <option key={t.teacherProfile?.id || t.id} value={t.teacherProfile?.id || t.id}>
                  {t.firstName} {t.lastName}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Timetable Grid */}
      <div className="card overflow-x-auto !p-0">
        <table className="w-full min-w-[700px] border-collapse">
          <thead>
            <tr>
              <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-3 w-24 bg-gray-50 border-b border-gray-200">
                <Clock className="w-4 h-4 inline mr-1" />
                Saat
              </th>
              {DAYS.map((d, idx) => {
                const isToday = idx === todayDayIndex;
                return (
                  <th
                    key={d}
                    className={`text-center text-xs font-semibold uppercase tracking-wider px-2 py-3 border-b border-gray-200 ${
                      isToday
                        ? 'bg-primary-50 text-primary-700'
                        : 'bg-gray-50 text-gray-500'
                    }`}
                  >
                    {dayLabels[d]}
                    {isToday && (
                      <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-primary-600 text-white leading-none">
                        Bugün
                      </span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {timeSlots.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-400">
                  <Clock className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p>Ders saatleri tanımlanmamış</p>
                </td>
              </tr>
            ) : (
              timeSlots.map((slot: any) => {
                const timePercent = currentTimePercent(slot);
                return (
                  <tr key={slot.id} className="border-t border-gray-100">
                    {/* Time slot column - period number prominent */}
                    <td className="px-3 py-2 bg-gray-50/60 border-r border-gray-100">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary-100 text-primary-700 text-sm font-bold shrink-0">
                          {slot.slotNumber}
                        </span>
                        <div className="leading-tight">
                          <div className="text-[11px] font-medium text-gray-700">{slot.startTime}</div>
                          <div className="text-[11px] text-gray-400">{slot.endTime}</div>
                        </div>
                      </div>
                    </td>
                    {DAYS.map((day, dayIdx) => {
                      const entry = getEntry(day, slot.id);
                      const isTodayCol = dayIdx === todayDayIndex;
                      const isCurrent = isCurrentSlot(day, slot);

                      return (
                        <td
                          key={day}
                          className={`px-1.5 py-1.5 text-center relative ${
                            isTodayCol ? 'bg-primary-50/40' : ''
                          }`}
                        >
                          {/* Current time red line */}
                          {isTodayCol && timePercent !== null && (
                            <div
                              className="absolute left-0 right-0 z-10 pointer-events-none"
                              style={{ top: `${timePercent}%` }}
                            >
                              <div className="flex items-center">
                                <div className="w-2 h-2 rounded-full bg-red-500 shrink-0 -ml-1" />
                                <div className="h-0.5 bg-red-500 w-full" />
                              </div>
                            </div>
                          )}

                          {entry ? (
                            <div
                              className={`rounded-lg p-2 text-xs transition-all hover:shadow-md shadow-sm ${
                                isCurrent ? 'ring-2 ring-primary-400 animate-pulse' : ''
                              }`}
                              style={{
                                backgroundColor: entry.subject?.color || '#3b82f6',
                                color: isColorDark(entry.subject?.color || '#3b82f6') ? '#ffffff' : '#1e293b',
                              }}
                            >
                              <div className="font-bold text-sm leading-tight truncate">
                                {entry.subject?.name}
                              </div>
                              {viewMode === 'class' && entry.teacherId && (
                                <div
                                  className="mt-1 text-xs truncate font-medium"
                                  style={{
                                    color: isColorDark(entry.subject?.color || '#3b82f6')
                                      ? 'rgba(255,255,255,0.85)'
                                      : 'rgba(0,0,0,0.6)',
                                  }}
                                >
                                  {entry.teacher?.user?.firstName} {entry.teacher?.user?.lastName}
                                </div>
                              )}
                              {viewMode === 'teacher' && entry.class && (
                                <div
                                  className="mt-1 text-xs truncate font-medium"
                                  style={{
                                    color: isColorDark(entry.subject?.color || '#3b82f6')
                                      ? 'rgba(255,255,255,0.85)'
                                      : 'rgba(0,0,0,0.6)',
                                  }}
                                >
                                  {entry.class.name}
                                </div>
                              )}
                              {entry.classroom && (
                                <div
                                  className="mt-1 text-xs flex items-center justify-center gap-0.5 truncate"
                                  style={{
                                    color: isColorDark(entry.subject?.color || '#3b82f6')
                                      ? 'rgba(255,255,255,0.7)'
                                      : 'rgba(0,0,0,0.5)',
                                  }}
                                >
                                  <DoorOpen className="w-3 h-3 shrink-0" />
                                  {entry.classroom.name}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div
                              className="rounded-lg border-2 border-dashed border-gray-200 py-3 text-xs text-gray-300 font-medium select-none"
                              style={{
                                backgroundImage:
                                  'repeating-linear-gradient(135deg, transparent, transparent 4px, rgba(0,0,0,0.03) 4px, rgba(0,0,0,0.03) 8px)',
                              }}
                            >
                              Boş
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {entries.length === 0 && timeSlots.length > 0 && (
        <div className="text-center py-8 text-gray-400">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">Henüz ders programı oluşturulmamış</p>
          {isAdmin && <p className="text-xs mt-1">Otomatik Oluştur sekmesinden FET ile oluşturabilirsiniz</p>}
        </div>
      )}
    </div>
  );
}

// ==================== ÖĞRETMEN ATAMALARI ====================

function AssignmentsManager() {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // New assignment form
  const [formTeacherId, setFormTeacherId] = useState('');
  const [formClassId, setFormClassId] = useState('');
  const [formSubjectId, setFormSubjectId] = useState('');
  const [formHours, setFormHours] = useState(4);

  const loadData = useCallback(async () => {
    try {
      const [clsRes, subRes, usersRes, assignRes] = await Promise.all([
        api.get('/classes'),
        api.get('/subjects'),
        api.get('/users?role=TEACHER&limit=100'),
        api.get('/timetable/fet/preview'),
      ]);
      setClasses(clsRes.data.data || []);
      setSubjects(subRes.data.data || []);
      setTeachers(usersRes.data.data || []);
      setAssignments(assignRes.data.data?.assignments || []);
    } catch {
      toast.error('Veriler yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleAddAssignment = async () => {
    if (!formTeacherId || !formClassId || !formSubjectId) {
      toast.error('Tüm alanları doldurun');
      return;
    }

    try {
      await api.post('/timetable/assignments', {
        teacherProfileId: formTeacherId,
        classId: formClassId,
        subjectId: formSubjectId,
        hoursPerWeek: formHours,
      });
      toast.success('Atama eklendi');
      setShowAddModal(false);
      setFormTeacherId('');
      setFormClassId('');
      setFormSubjectId('');
      setFormHours(4);
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Atama eklenemedi');
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Hangi öğretmen hangi sınıfa hangi dersi haftada kaç saat verecek - FET bu atamalara göre program oluşturur.
        </p>
        <button onClick={() => setShowAddModal(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Atama Ekle
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card !p-4 text-center">
          <div className="text-2xl font-bold text-primary-600">{teachers.length}</div>
          <div className="text-xs text-gray-500">Öğretmen</div>
        </div>
        <div className="card !p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{classes.length}</div>
          <div className="text-xs text-gray-500">Sınıf</div>
        </div>
        <div className="card !p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">{subjects.length}</div>
          <div className="text-xs text-gray-500">Ders</div>
        </div>
        <div className="card !p-4 text-center">
          <div className="text-2xl font-bold text-orange-600">{assignments.length}</div>
          <div className="text-xs text-gray-500">Atama</div>
        </div>
      </div>

      {/* Assignments Table */}
      <div className="card !p-0 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 text-left">
              <th className="px-4 py-3 text-xs font-medium text-gray-500">Öğretmen</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500">Ders</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500">Sınıf</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-500 text-center">Haftalık Saat</th>
            </tr>
          </thead>
          <tbody>
            {assignments.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-12 text-gray-400">
                  <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Henüz öğretmen ataması yapılmamış</p>
                </td>
              </tr>
            ) : (
              assignments.map((a: any, i: number) => (
                <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{a.teacher}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{a.subject}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{a.class}</td>
                  <td className="px-4 py-3 text-sm text-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-700">
                      {a.hoursPerWeek} saat
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Assignment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">Öğretmen Ataması Ekle</h3>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Öğretmen</label>
                <select className="input w-full" value={formTeacherId} onChange={e => setFormTeacherId(e.target.value)}>
                  <option value="">Seçin...</option>
                  {teachers.map((t: any) => (
                    <option key={t.teacherProfile?.id} value={t.teacherProfile?.id}>
                      {t.firstName} {t.lastName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Ders</label>
                <select className="input w-full" value={formSubjectId} onChange={e => setFormSubjectId(e.target.value)}>
                  <option value="">Seçin...</option>
                  {subjects.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Sınıf</label>
                <select className="input w-full" value={formClassId} onChange={e => setFormClassId(e.target.value)}>
                  <option value="">Seçin...</option>
                  {classes.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Haftalık Ders Saati</label>
                <input
                  type="number"
                  className="input w-full"
                  min={1}
                  max={20}
                  value={formHours}
                  onChange={e => setFormHours(parseInt(e.target.value) || 1)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowAddModal(false)} className="btn-secondary">
                İptal
              </button>
              <button onClick={handleAddAssignment} className="btn-primary">
                Ekle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== FET DERS PROGRAMI OLUŞTURMA ====================

function FetGenerator() {
  const [fetHealth, setFetHealth] = useState<{ ok: boolean; fetClAvailable: boolean } | null>(null);
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState<any>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  // Constraints state
  const [maxHoursDaily, setMaxHoursDaily] = useState(8);
  const [teacherMaxHours, setTeacherMaxHours] = useState(6);
  const [teacherMaxGaps, setTeacherMaxGaps] = useState(2);

  const loadInitData = useCallback(async () => {
    try {
      const [healthRes, previewRes] = await Promise.all([
        api.get('/timetable/fet/health'),
        api.get('/timetable/fet/preview'),
      ]);
      setFetHealth(healthRes.data.data);
      setPreview(previewRes.data.data);
    } catch {
      toast.error('FET durumu alınamadı');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadInitData(); }, [loadInitData]);

  // Poll job status
  useEffect(() => {
    if (!jobId || jobStatus === 'completed' || jobStatus === 'failed') return;

    const interval = setInterval(async () => {
      try {
        const { data } = await api.get(`/timetable/fet/status/${jobId}`);
        const status = data.data?.status;
        setJobStatus(status);

        if (status === 'completed') {
          const { data: resultData } = await api.get(`/timetable/fet/result/${jobId}`);
          setGenerationResult(resultData.data);
          setGenerating(false);
          toast.success('Ders programı oluşturuldu!');
        } else if (status === 'failed') {
          setGenerating(false);
          toast.error('Ders programı oluşturulamadı: ' + (data.data?.error || 'Bilinmeyen hata'));
        }
      } catch {}
    }, 2000);

    return () => clearInterval(interval);
  }, [jobId, jobStatus]);

  const handleGenerate = async () => {
    if (!preview?.assignmentsCount) {
      toast.error('Önce öğretmen atamaları yapılmalı');
      return;
    }

    setGenerating(true);
    setGenerationResult(null);
    setJobId(null);
    setJobStatus(null);

    try {
      // Build constraints
      const constraints: any = {
        teacherMaxHoursDaily: preview.teachers?.map((t: any) => ({
          teacherName: t.name,
          maxHours: teacherMaxHours,
        })),
        teacherMaxGapsDaily: preview.teachers?.map((t: any) => ({
          teacherName: t.name,
          maxGaps: teacherMaxGaps,
        })),
        classMaxHoursDaily: preview.classes?.map((c: any) => ({
          className: c.name,
          maxHours: maxHoursDaily,
        })),
      };

      // Try sync generation first (faster for small schools)
      if (preview.activities < 100) {
        const { data } = await api.post('/timetable/fet/generate-sync', { constraints });
        if (data.success) {
          setGenerationResult(data.data);
          toast.success('Ders programı oluşturuldu!');
        } else {
          toast.error(data.message || 'Oluşturulamadı');
        }
        setGenerating(false);
      } else {
        // Async generation for larger schools
        const { data } = await api.post('/timetable/fet/generate', { constraints });
        if (data.data?.jobId) {
          setJobId(data.data.jobId);
          setJobStatus('running');
          toast('Ders programı oluşturuluyor...', { icon: '⏳' });
        } else {
          toast.error(data.data?.error || 'Başlatılamadı');
          setGenerating(false);
        }
      }
    } catch (err: any) {
      toast.error('Hata: ' + (err.response?.data?.message || err.message));
      setGenerating(false);
    }
  };

  const handleImport = async () => {
    if (!generationResult?.entries?.length) {
      toast.error('İçe aktarılacak veri yok');
      return;
    }

    setImporting(true);
    try {
      const { data } = await api.post('/timetable/fet/import', {
        entries: generationResult.entries,
      });

      if (data.success) {
        const result = data.data;
        toast.success(
          `${result.importedCount} kayıt aktarıldı` +
          (result.errorCount > 0 ? `, ${result.errorCount} hata` : '')
        );
      }
    } catch (err: any) {
      toast.error('İçe aktarma hatası: ' + (err.response?.data?.message || err.message));
    } finally {
      setImporting(false);
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
      {/* FET Status */}
      <div className="card !p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${fetHealth?.ok ? 'bg-green-500' : 'bg-red-500'}`} />
            <div>
              <div className="text-sm font-medium">
                FET Servisi: {fetHealth?.ok ? 'Çalışıyor' : 'Bağlantı Yok'}
              </div>
              <div className="text-xs text-gray-500">
                {fetHealth?.fetClAvailable
                  ? 'fet-cl kurulu - otomatik oluşturma kullanılabilir'
                  : 'fet-cl kurulu değil - "sudo apt install fet" ile kurun'}
              </div>
            </div>
          </div>
          <button onClick={loadInitData} className="text-gray-400 hover:text-gray-600">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Data Summary */}
      {preview && (
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Mevcut Veriler</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary-600" />
              <div>
                <div className="text-lg font-bold">{preview.teachers?.length || 0}</div>
                <div className="text-xs text-gray-500">Öğretmen</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-green-600" />
              <div>
                <div className="text-lg font-bold">{preview.classes?.length || 0}</div>
                <div className="text-xs text-gray-500">Sınıf</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-600" />
              <div>
                <div className="text-lg font-bold">{preview.assignmentsCount || 0}</div>
                <div className="text-xs text-gray-500">Atama</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-600" />
              <div>
                <div className="text-lg font-bold">{preview.activities || 0}</div>
                <div className="text-xs text-gray-500">Toplam Ders Saati</div>
              </div>
            </div>
          </div>

          {(!preview.assignmentsCount || preview.assignmentsCount === 0) && (
            <div className="mt-4 p-3 bg-yellow-50 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600 shrink-0" />
              <p className="text-sm text-yellow-700">
                Ders programı oluşturmak için önce Öğretmen Atamaları sekmesinden atama yapın.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Constraints */}
      <div className="card">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">
          <Settings className="w-4 h-4 inline mr-1" />
          Kısıtlamalar
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Sınıf Maks. Günlük Ders</label>
            <input
              type="number"
              className="input w-full"
              min={1}
              max={10}
              value={maxHoursDaily}
              onChange={e => setMaxHoursDaily(parseInt(e.target.value) || 8)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Öğretmen Maks. Günlük Ders</label>
            <input
              type="number"
              className="input w-full"
              min={1}
              max={10}
              value={teacherMaxHours}
              onChange={e => setTeacherMaxHours(parseInt(e.target.value) || 6)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Öğretmen Maks. Günlük Boşluk</label>
            <input
              type="number"
              className="input w-full"
              min={0}
              max={5}
              value={teacherMaxGaps}
              onChange={e => setTeacherMaxGaps(parseInt(e.target.value) || 2)}
            />
          </div>
        </div>
      </div>

      {/* Generate Button */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleGenerate}
          disabled={generating || !preview?.assignmentsCount}
          className="btn-primary flex items-center gap-2 px-6 py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {generating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Oluşturuluyor...
            </>
          ) : (
            <>
              <Wand2 className="w-5 h-5" />
              Ders Programı Oluştur
            </>
          )}
        </button>

        {generating && jobStatus && (
          <div className="text-sm text-gray-500 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Durum: {jobStatus === 'running' ? 'Çalışıyor...' : jobStatus}
          </div>
        )}
      </div>

      {/* Generation Result */}
      {generationResult && (
        <div className="space-y-4">
          <div className="card border-green-200 bg-green-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <div className="text-sm font-semibold text-green-800">
                    Ders Programı Oluşturuldu
                  </div>
                  <div className="text-xs text-green-600">
                    {generationResult.entries?.length || 0} ders saati yerleştirildi
                    {generationResult.generationInfo && (
                      <> / {generationResult.generationInfo.totalActivities} toplam</>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={handleImport}
                disabled={importing}
                className="btn-primary flex items-center gap-2"
              >
                {importing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Veritabanına Aktar
              </button>
            </div>
          </div>

          {/* Preview of generated timetable */}
          {generationResult.entries?.length > 0 && (
            <FetResultPreview entries={generationResult.entries} />
          )}

          {/* Soft conflicts */}
          {generationResult.softConflicts?.length > 0 && (
            <div className="card border-yellow-200 bg-yellow-50">
              <h4 className="text-sm font-semibold text-yellow-800 mb-2">
                <AlertCircle className="w-4 h-4 inline mr-1" />
                Uyarılar ({generationResult.softConflicts.length})
              </h4>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {generationResult.softConflicts.map((c: string, i: number) => (
                  <div key={i} className="text-xs text-yellow-700">{c}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ==================== FET SONUÇ ÖNİZLEME ====================

function FetResultPreview({ entries }: { entries: any[] }) {
  // Group by class
  const classTimetables = new Map<string, any[]>();
  for (const entry of entries) {
    const className = entry.students || entry.class || 'Bilinmeyen';
    if (!classTimetables.has(className)) classTimetables.set(className, []);
    classTimetables.get(className)!.push(entry);
  }

  const classNames = Array.from(classTimetables.keys());
  const [selectedClass, setSelectedClass] = useState(
    classNames.length > 0 ? classNames[0] : ''
  );

  const classEntries = classTimetables.get(selectedClass) || [];

  // Build grid
  const getEntry = (dayIdx: number, hourIdx: number) =>
    classEntries.find((e: any) => e.dayIndex === dayIdx && e.hourIndex === hourIdx);

  const maxHours = Math.max(...entries.map(e => (e.hourIndex || 0) + 1), 8);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-gray-900">Önizleme</h4>
        <select
          className="input w-48"
          value={selectedClass}
          onChange={e => setSelectedClass(e.target.value)}
        >
          {Array.from(classTimetables.keys()).map(cls => (
            <option key={cls} value={cls}>{cls}</option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left text-xs font-medium text-gray-500 px-3 py-2 w-20">Saat</th>
              {DAY_NAMES_TR.map((d, i) => (
                <th key={i} className="text-center text-xs font-medium text-gray-500 px-2 py-2">{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: maxHours }, (_, hourIdx) => (
              <tr key={hourIdx} className="border-t border-gray-100">
                <td className="px-3 py-2 text-xs font-medium text-gray-600">{hourIdx + 1}. Ders</td>
                {Array.from({ length: 5 }, (_, dayIdx) => {
                  const entry = getEntry(dayIdx, hourIdx);
                  return (
                    <td key={dayIdx} className="px-2 py-1.5 text-center">
                      {entry ? (
                        <div className="rounded-md bg-primary-50 border border-primary-100 p-1.5 text-xs">
                          <div className="font-medium text-primary-700">{entry.subject}</div>
                          <div className="text-gray-500 text-[10px]">{entry.teacher}</div>
                          {entry.room && <div className="text-gray-400 text-[10px]">{entry.room}</div>}
                        </div>
                      ) : (
                        <div className="text-gray-200 text-xs">-</div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
