'use client';

import { useEffect, useState, useMemo } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { BarChart3, Loader2, Users, User } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ClassOption {
  id: string;
  name: string;
}

interface StudentAttendanceStat {
  studentProfileId: string;
  studentName: string;
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function rateColorClass(rate: number): string {
  if (rate >= 90) return 'bg-emerald-100 text-emerald-700';
  if (rate >= 75) return 'bg-amber-100 text-amber-700';
  return 'bg-red-100 text-red-700';
}

function absentColorClass(absent: number): string {
  if (absent > 10) return 'text-red-600 font-bold';
  return 'text-gray-900';
}

function formatDateInput(date: Date): string {
  return date.toISOString().split('T')[0];
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AttendanceReportPage() {
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return formatDateInput(d);
  });
  const [endDate, setEndDate] = useState(() => formatDateInput(new Date()));
  const [stats, setStats] = useState<StudentAttendanceStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);

  // Fetch classes on mount
  useEffect(() => {
    api
      .get('/classes')
      .then(({ data }) => {
        const classList = data.data || [];
        setClasses(classList);
        if (classList.length > 0) setSelectedClassId(classList[0].id);
      })
      .catch(() => toast.error('Siniflar yuklenemedi'))
      .finally(() => setLoading(false));
  }, []);

  // Fetch attendance stats when filters change
  useEffect(() => {
    if (!selectedClassId || !startDate || !endDate) return;
    setStatsLoading(true);
    api
      .get(`/attendance/class/${selectedClassId}/stats`, {
        params: { startDate, endDate },
      })
      .then(({ data }) => {
        setStats(data.data || []);
      })
      .catch(() => toast.error('Devamsizlik verileri yuklenemedi'))
      .finally(() => setStatsLoading(false));
  }, [selectedClassId, startDate, endDate]);

  // Compute summary
  const summary = useMemo(() => {
    if (stats.length === 0) return null;
    const totalStudents = stats.length;
    const avgRate =
      stats.reduce((sum, s) => {
        const rate = s.total > 0 ? (s.present / s.total) * 100 : 0;
        return sum + rate;
      }, 0) / totalStudents;
    const highAbsentCount = stats.filter((s) => s.absent > 10).length;
    return { totalStudents, avgRate, highAbsentCount };
  }, [stats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-primary-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Devamsizlik Raporu</h1>
          <p className="text-sm text-gray-500">Sinif bazli devamsizlik istatistikleri</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sinif</label>
            <select
              className="input w-48"
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Baslangic Tarihi</label>
            <input
              type="date"
              className="input w-44"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bitis Tarihi</label>
            <input
              type="date"
              className="input w-44"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{summary.totalStudents}</p>
              <p className="text-sm text-gray-500">Toplam Ogrenci</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${rateColorClass(summary.avgRate)}`}>
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">%{Math.round(summary.avgRate * 10) / 10}</p>
              <p className="text-sm text-gray-500">Ortalama Devam Orani</p>
            </div>
          </div>
          <div className="card flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${summary.highAbsentCount > 0 ? 'bg-red-100' : 'bg-emerald-100'}`}>
              <User className={`w-6 h-6 ${summary.highAbsentCount > 0 ? 'text-red-600' : 'text-emerald-600'}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{summary.highAbsentCount}</p>
              <p className="text-sm text-gray-500">10+ Gun Devamsiz</p>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card !p-0 overflow-hidden">
        {statsLoading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-6 h-6 text-primary-600 animate-spin mx-auto" />
          </div>
        ) : stats.length === 0 ? (
          <div className="p-12 text-center">
            <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-gray-400 text-sm">
              {selectedClassId ? 'Bu tarih araliginda devamsizlik verisi bulunamadi' : 'Sinif secin'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left text-xs font-medium text-gray-500 px-6 py-3">#</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-6 py-3">Ogrenci</th>
                  <th className="text-center text-xs font-medium text-gray-500 px-4 py-3">Toplam</th>
                  <th className="text-center text-xs font-medium text-gray-500 px-4 py-3">Gelen</th>
                  <th className="text-center text-xs font-medium text-gray-500 px-4 py-3">Devamsiz</th>
                  <th className="text-center text-xs font-medium text-gray-500 px-4 py-3">Gec Kalan</th>
                  <th className="text-center text-xs font-medium text-gray-500 px-4 py-3">Izinli</th>
                  <th className="text-center text-xs font-medium text-gray-500 px-4 py-3">Devam Orani</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {stats.map((st, idx) => {
                  const rate = st.total > 0 ? (st.present / st.total) * 100 : 0;
                  const rateRounded = Math.round(rate * 10) / 10;

                  return (
                    <tr key={st.studentProfileId} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3 text-sm text-gray-400">{idx + 1}</td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                            <User className="w-4 h-4 text-primary-600" />
                          </div>
                          <span className="text-sm font-medium text-gray-900">{st.studentName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-900">{st.total}</td>
                      <td className="px-4 py-3 text-center text-sm text-emerald-600 font-medium">{st.present}</td>
                      <td className={`px-4 py-3 text-center text-sm ${absentColorClass(st.absent)}`}>
                        {st.absent}
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-amber-600">{st.late}</td>
                      <td className="px-4 py-3 text-center text-sm text-blue-600">{st.excused}</td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center justify-center px-3 py-1 rounded-lg text-xs font-bold ${rateColorClass(rateRounded)}`}
                        >
                          %{rateRounded}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
