'use client';

import { useEffect, useState, useMemo } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { attendanceLabels } from '@/lib/utils';
import toast from 'react-hot-toast';
import {
  Loader2,
  ClipboardCheck,
  Check,
  X,
  Clock,
  Shield,
  CheckCheck,
  Save,
} from 'lucide-react';

type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';

interface AttendanceRecord {
  studentProfileId: string;
  status: AttendanceStatus;
  note?: string;
}

const STATUS_CONFIG: Record<
  AttendanceStatus,
  { bg: string; activeBg: string; activeText: string; icon: React.ElementType; label: string }
> = {
  PRESENT: {
    bg: 'bg-gray-100 text-gray-600 hover:bg-green-50 hover:text-green-700',
    activeBg: 'bg-green-500 ring-2 ring-green-300',
    activeText: 'text-white',
    icon: Check,
    label: 'Geldi',
  },
  ABSENT: {
    bg: 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-700',
    activeBg: 'bg-red-500 ring-2 ring-red-300',
    activeText: 'text-white',
    icon: X,
    label: 'Gelmedi',
  },
  LATE: {
    bg: 'bg-gray-100 text-gray-600 hover:bg-yellow-50 hover:text-yellow-700',
    activeBg: 'bg-yellow-500 ring-2 ring-yellow-300',
    activeText: 'text-white',
    icon: Clock,
    label: 'Geç Kaldı',
  },
  EXCUSED: {
    bg: 'bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-700',
    activeBg: 'bg-blue-500 ring-2 ring-blue-300',
    activeText: 'text-white',
    icon: Shield,
    label: 'İzinli',
  },
};

function getInitials(firstName?: string, lastName?: string): string {
  const f = firstName?.charAt(0)?.toUpperCase() || '';
  const l = lastName?.charAt(0)?.toUpperCase() || '';
  return f + l || '?';
}

function getAvatarColor(name: string): string {
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-teal-500',
    'bg-orange-500',
    'bg-cyan-500',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export default function AttendancePage() {
  const { user } = useAuthStore();
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [timetableEntries, setTimetableEntries] = useState<any[]>([]);
  const [selectedEntryId, setSelectedEntryId] = useState('');
  const [timetableLoading, setTimetableLoading] = useState(false);

  useEffect(() => {
    api
      .get('/classes')
      .then(({ data }) => {
        setClasses(data.data || []);
        if (data.data?.length > 0) setSelectedClass(data.data[0].id);
      })
      .catch(() => {
        toast.error('Sınıflar yüklenemedi');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedClass) {
      setStudentsLoading(true);
      api
        .get(`/classes/${selectedClass}`)
        .then(({ data }) => {
          const studentList = data.data?.students || [];
          setStudents(studentList);
          const att: Record<string, AttendanceStatus> = {};
          studentList.forEach((s: any) => {
            att[s.id] = 'PRESENT';
          });
          setAttendance(att);
          setNotes({});
        })
        .catch(() => {
          toast.error('Öğrenci listesi yüklenemedi');
        })
        .finally(() => setStudentsLoading(false));
    }
  }, [selectedClass]);

  useEffect(() => {
    if (!selectedClass || !date) return;
    setTimetableLoading(true);
    api
      .get(`/timetable/class/${selectedClass}`)
      .then(({ data }) => {
        const dayOfWeek = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'][
          new Date(date).getDay()
        ];
        const dayEntries = (data.data || []).filter((e: any) => e.dayOfWeek === dayOfWeek);
        setTimetableEntries(dayEntries);
        if (dayEntries.length > 0) {
          setSelectedEntryId(dayEntries[0].id);
        } else {
          setSelectedEntryId('');
        }
      })
      .catch(() => {
        setTimetableEntries([]);
        setSelectedEntryId('');
      })
      .finally(() => setTimetableLoading(false));
  }, [selectedClass, date]);

  useEffect(() => {
    if (!selectedClass || !date) return;
    if (!students || students.length === 0) return;
    api
      .get(`/attendance/class/${selectedClass}`, { params: { date } })
      .then(({ data }) => {
        const records = data.data || [];
        if (records.length > 0 && students.length > 0) {
          
          const relevantRecords = selectedEntryId
            ? records.filter((r: any) => r.timetableEntryId === selectedEntryId)
            : records;

          if (relevantRecords.length > 0) {
            const att: Record<string, AttendanceStatus> = {};
            const nts: Record<string, string> = {};
            
            students.forEach((s: any) => {
              att[s.id] = 'PRESENT';
            });
            
            relevantRecords.forEach((r: any) => {
              att[r.studentProfileId] = r.status;
              if (r.note) nts[r.studentProfileId] = r.note;
            });
            setAttendance(att);
            setNotes(nts);
          }
        }
      })
      .catch(() => {
        
      });
  }, [selectedClass, date, selectedEntryId, students]);

  const summary = useMemo(() => {
    const counts = { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0 };
    Object.values(attendance).forEach((status) => {
      if (counts[status] !== undefined) counts[status]++;
    });
    return counts;
  }, [attendance]);

  const handleMarkAllPresent = () => {
    const att: Record<string, AttendanceStatus> = {};
    students.forEach((s: any) => {
      att[s.id] = 'PRESENT';
    });
    setAttendance(att);
  };

  const handleSave = async () => {
    if (!selectedEntryId) {
      toast.error('Lütfen bir ders saati seçin');
      return;
    }
    if (students.length === 0) {
      toast.error('Yoklama alınacak öğrenci yok');
      return;
    }

    setSaving(true);
    try {
      const studentsPayload: AttendanceRecord[] = Object.entries(attendance).map(
        ([studentProfileId, status]) => ({
          studentProfileId,
          status,
          ...(notes[studentProfileId] ? { note: notes[studentProfileId] } : {}),
        })
      );

      await api.post('/attendance', {
        classId: selectedClass,
        date,
        timetableEntryId: selectedEntryId,
        students: studentsPayload,
      });

      toast.success('Yoklama başarıyla kaydedildi');
    } catch (err: any) {
      const message = err.response?.data?.message;
      toast.error(
        typeof message === 'string' ? message : Array.isArray(message) ? message[0] : 'Yoklama kaydedilemedi'
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Yoklama</h1>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ClipboardCheck className="w-7 h-7 text-primary-600" />
          Yoklama
        </h1>
      </div>

      {classes.length === 0 ? (
        <div className="card text-center py-12">
          <ClipboardCheck className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-gray-400 text-sm">Henüz sınıf tanımlanmamış</p>
        </div>
      ) : (
        <>
          <div className="card">
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Sınıf</label>
                <select
                  className="input w-48"
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                >
                  {classes.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Tarih</label>
                <input
                  type="date"
                  className="input w-48"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Ders Saati</label>
                {timetableLoading ? (
                  <div className="input w-56 flex items-center">
                    <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                    <span className="ml-2 text-sm text-gray-400">Yükleniyor...</span>
                  </div>
                ) : (
                  <select
                    className="input w-56"
                    value={selectedEntryId}
                    onChange={(e) => setSelectedEntryId(e.target.value)}
                  >
                    {timetableEntries.length === 0 && (
                      <option value="">Bu gün ders yok</option>
                    )}
                    {timetableEntries.map((e: any) => (
                      <option key={e.id} value={e.id}>
                        {e.timeSlot?.slotNumber}. Ders - {e.subject?.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div>

          {students.length > 0 && (
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 bg-green-50 text-green-700 px-3 py-1.5 rounded-full text-sm font-medium">
                <Check className="w-4 h-4" />
                Geldi: {summary.PRESENT}
              </div>
              <div className="flex items-center gap-1.5 bg-red-50 text-red-700 px-3 py-1.5 rounded-full text-sm font-medium">
                <X className="w-4 h-4" />
                Gelmedi: {summary.ABSENT}
              </div>
              <div className="flex items-center gap-1.5 bg-yellow-50 text-yellow-700 px-3 py-1.5 rounded-full text-sm font-medium">
                <Clock className="w-4 h-4" />
                Geç: {summary.LATE}
              </div>
              <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-sm font-medium">
                <Shield className="w-4 h-4" />
                İzinli: {summary.EXCUSED}
              </div>

              <div className="ml-auto">
                <button
                  onClick={handleMarkAllPresent}
                  className="flex items-center gap-1.5 bg-green-50 hover:bg-green-100 text-green-700 px-4 py-1.5 rounded-full text-sm font-medium transition-colors"
                >
                  <CheckCheck className="w-4 h-4" />
                  Tümünü Geldi İşaretle
                </button>
              </div>
            </div>
          )}

          <div className="card !p-0 overflow-hidden">
            {studentsLoading ? (
              <div className="p-8 text-center">
                <Loader2 className="w-6 h-6 text-primary-600 animate-spin mx-auto" />
              </div>
            ) : (
              <>
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                        Öğrenci
                      </th>
                      <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                        Durum
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {students.map((s: any) => {
                      const fullName = `${s.user?.firstName || ''} ${s.user?.lastName || ''}`.trim();
                      const initials = getInitials(s.user?.firstName, s.user?.lastName);
                      const avatarColor = getAvatarColor(fullName);

                      return (
                        <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-3">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-9 h-9 rounded-full ${avatarColor} flex items-center justify-center text-white text-sm font-semibold flex-shrink-0`}
                              >
                                {initials}
                              </div>
                              {s.studentNumber && (
                                <span className="text-xs text-gray-400 font-mono bg-gray-100 px-1.5 py-0.5 rounded">{s.studentNumber}</span>
                              )}
                              <span className="text-sm font-medium text-gray-900">{fullName}</span>
                            </div>
                          </td>
                          <td className="px-6 py-3">
                            <div className="flex justify-center gap-2">
                              {(
                                ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'] as const
                              ).map((status) => {
                                const config = STATUS_CONFIG[status];
                                const Icon = config.icon;
                                const isActive = attendance[s.id] === status;

                                return (
                                  <button
                                    key={status}
                                    onClick={() =>
                                      setAttendance((prev) => ({ ...prev, [s.id]: status }))
                                    }
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 ${
                                      isActive
                                        ? `${config.activeBg} ${config.activeText} shadow-sm`
                                        : config.bg
                                    }`}
                                  >
                                    <Icon className="w-3.5 h-3.5" />
                                    {config.label}
                                  </button>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {students.length === 0 && (
                  <div className="p-8 text-center text-gray-400 text-sm">
                    Bu sınıfta öğrenci yok
                  </div>
                )}
              </>
            )}
          </div>

          {students.length > 0 && (
            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving || !selectedEntryId}
                className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {saving ? 'Kaydediliyor...' : 'Yoklamayı Kaydet'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
