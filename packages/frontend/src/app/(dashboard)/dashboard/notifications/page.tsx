'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import {
  Bell,
  BellRing,
  CheckCheck,
  ClipboardCheck,
  GraduationCap,
  Megaphone,
  FileText,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Inbox,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const typeConfig: Record<string, { label: string; icon: React.ReactNode; bgClass: string; textClass: string; borderClass: string }> = {
  ATTENDANCE: {
    label: 'Yoklama',
    icon: <ClipboardCheck className="w-5 h-5" />,
    bgClass: 'bg-blue-50',
    textClass: 'text-blue-600',
    borderClass: 'border-blue-200',
  },
  GRADE: {
    label: 'Not',
    icon: <GraduationCap className="w-5 h-5" />,
    bgClass: 'bg-green-50',
    textClass: 'text-green-600',
    borderClass: 'border-green-200',
  },
  ANNOUNCEMENT: {
    label: 'Duyuru',
    icon: <Megaphone className="w-5 h-5" />,
    bgClass: 'bg-purple-50',
    textClass: 'text-purple-600',
    borderClass: 'border-purple-200',
  },
  ASSIGNMENT: {
    label: 'Ödev',
    icon: <FileText className="w-5 h-5" />,
    bgClass: 'bg-orange-50',
    textClass: 'text-orange-600',
    borderClass: 'border-orange-200',
  },
};

const defaultTypeConfig = {
  label: 'Bildirim',
  icon: <Bell className="w-5 h-5" />,
  bgClass: 'bg-gray-50',
  textClass: 'text-gray-600',
  borderClass: 'border-gray-200',
};

function formatNotificationDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Az önce';
  if (diffMins < 60) return `${diffMins} dk önce`;
  if (diffHours < 24) return `${diffHours} saat önce`;
  if (diffDays < 7) return `${diffDays} gün önce`;

  return date.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<PaginationMeta>({ total: 0, page: 1, limit: 20, totalPages: 1 });

  const fetchNotifications = useCallback(async (currentPage: number) => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page: currentPage, limit: 20 };
      if (filter === 'unread') {
        params.isRead = false;
      }
      const { data } = await api.get('/notifications', { params });
      const list = data.data?.data || data.data || [];
      setNotifications(Array.isArray(list) ? list : []);
      if (data.data?.meta) {
        setMeta(data.data.meta);
      } else if (data.meta) {
        setMeta(data.meta);
      } else {
        setMeta({
          total: Array.isArray(list) ? list.length : 0,
          page: currentPage,
          limit: 20,
          totalPages: 1,
        });
      }
    } catch {
      toast.error('Bildirimler yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    setPage(1);
    fetchNotifications(1);
  }, [filter, fetchNotifications]);

  useEffect(() => {
    fetchNotifications(page);
  }, [page, fetchNotifications]);

  // Mark single as read
  const markAsRead = async (id: string) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    );
    try {
      await api.put(`/notifications/${id}/read`);
    } catch {
      // Revert on error
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: false } : n)),
      );
      toast.error('Bildirim okundu olarak işaretlenemedi');
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    setMarkingAll(true);
    try {
      await api.put('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      toast.success('Tüm bildirimler okundu olarak işaretlendi');
    } catch {
      toast.error('Bildirimler işaretlenemedi');
    } finally {
      setMarkingAll(false);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------

  if (loading && notifications.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Bildirimler</h1>
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
          <span className="text-sm text-gray-400">Bildirimler yükleniyor...</span>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
            <BellRing className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Bildirimler</h1>
            <p className="text-sm text-gray-400">
              {meta.total} bildirim
              {unreadCount > 0 && (
                <span className="ml-2 text-primary-600 font-medium">
                  {unreadCount} okunmamış
                </span>
              )}
            </p>
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            disabled={markingAll}
            className="btn-primary flex items-center gap-2 shadow-lg shadow-primary-200"
          >
            {markingAll ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCheck className="w-4 h-4" />
            )}
            Tümünü Okundu İşaretle
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            filter === 'all'
              ? 'bg-primary-50 text-primary-700 border border-primary-300'
              : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300'
          }`}
        >
          Tümü
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            filter === 'unread'
              ? 'bg-primary-50 text-primary-700 border border-primary-300'
              : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300'
          }`}
        >
          Okunmamış
        </button>
      </div>

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <div className="card text-center py-16">
          <Inbox className="w-14 h-14 mx-auto mb-4 text-gray-200" />
          <p className="text-gray-400 text-base font-medium">
            {filter === 'unread' ? 'Okunmamış bildiriminiz yok' : 'Henüz bildirim yok'}
          </p>
          {filter === 'unread' && (
            <button
              onClick={() => setFilter('all')}
              className="mt-3 text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              Tüm bildirimleri göster
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => {
            const cfg = typeConfig[notification.type] || defaultTypeConfig;
            return (
              <div
                key={notification.id}
                onClick={() => {
                  if (!notification.isRead) markAsRead(notification.id);
                }}
                className={`
                  relative rounded-xl border transition-all duration-200
                  ${notification.isRead
                    ? 'border-gray-100 bg-white'
                    : 'border-l-4 border-l-primary-500 border-gray-100 bg-white shadow-sm hover:shadow-md cursor-pointer'
                  }
                `}
              >
                <div className="p-4 sm:p-5 flex items-start gap-4">
                  {/* Type icon */}
                  <div
                    className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${cfg.bgClass} ${cfg.textClass}`}
                  >
                    {cfg.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3
                            className={`text-sm ${
                              notification.isRead
                                ? 'font-medium text-gray-700'
                                : 'font-bold text-gray-900'
                            } truncate`}
                          >
                            {notification.title}
                          </h3>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bgClass} ${cfg.textClass}`}
                          >
                            {cfg.label}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 line-clamp-2">
                          {notification.message}
                        </p>
                      </div>

                      {/* Unread indicator */}
                      {!notification.isRead && (
                        <div className="flex-shrink-0 mt-1">
                          <span className="block w-2.5 h-2.5 rounded-full bg-primary-500 ring-2 ring-primary-200" />
                        </div>
                      )}
                    </div>

                    {/* Date */}
                    <p className="text-xs text-gray-400 mt-2">
                      {formatNotificationDate(notification.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-gray-500">
            Sayfa {meta.page} / {meta.totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
              disabled={page >= meta.totalPages}
              className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
