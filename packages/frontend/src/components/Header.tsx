'use client';

import { useAuthStore } from '@/stores/auth.store';
import { Bell, Clock, LogOut, User, ChevronDown, School, Check } from 'lucide-react';
import { roleLabels } from '@/lib/utils';
import { useState, useEffect, useRef, useCallback } from 'react';
import api from '@/lib/api';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Az once';
  if (minutes < 60) return `${minutes} dk once`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} saat once`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} gun once`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks} hafta once`;
  return new Date(dateStr).toLocaleDateString('tr-TR');
}

function notificationTypeIcon(type: string): string {
  switch (type) {
    case 'ATTENDANCE': return 'bg-blue-100 text-blue-600';
    case 'GRADE': return 'bg-green-100 text-green-600';
    case 'ANNOUNCEMENT': return 'bg-yellow-100 text-yellow-600';
    case 'ASSIGNMENT': return 'bg-purple-100 text-purple-600';
    default: return 'bg-gray-100 text-gray-600';
  }
}

export default function Header() {
  const { user, logout } = useAuthStore();

  // Clock state
  const [currentTime, setCurrentTime] = useState('');

  // Notification dropdown
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifLoading, setNotifLoading] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  // User dropdown
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Live clock - update every minute
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
      );
    };
    updateClock();
    const interval = setInterval(updateClock, 60000);
    return () => clearInterval(interval);
  }, []);

  // Fetch unread count on mount and periodically
  const fetchUnreadCount = useCallback(async () => {
    try {
      const { data } = await api.get('/notifications/unread-count');
      if (data.success) {
        setUnreadCount(data.data.count);
      }
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // Fetch notifications when dropdown opens
  const fetchNotifications = async () => {
    setNotifLoading(true);
    try {
      const { data } = await api.get('/notifications');
      if (data.success) {
        setNotifications(data.data.slice(0, 5));
      }
    } catch {
      // silently fail
    } finally {
      setNotifLoading(false);
    }
  };

  const handleNotifToggle = () => {
    if (!notifOpen) {
      fetchNotifications();
    }
    setNotifOpen(!notifOpen);
    setUserMenuOpen(false);
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // silently fail
    }
  };

  const handleUserMenuToggle = () => {
    setUserMenuOpen(!userMenuOpen);
    setNotifOpen(false);
  };

  const handleLogout = async () => {
    setUserMenuOpen(false);
    await logout();
    window.location.href = '/login';
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const schoolName = user?.school?.name || (typeof window !== 'undefined' ? localStorage.getItem('schoolName') : null);

  return (
    <header className="h-16 bg-white border-b border-gray-200 shadow-sm flex items-center justify-between px-6">
      {/* Left side - Welcome and school */}
      <div className="flex items-center gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Hos geldiniz, {user?.firstName}
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">
              {user?.role ? roleLabels[user.role] : ''}
            </span>
            {schoolName && (
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <School className="w-3 h-3" />
                {schoolName}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right side - Clock, notifications, user */}
      <div className="flex items-center gap-3">
        {/* Live clock */}
        <div className="hidden sm:flex items-center gap-1.5 text-sm text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg">
          <Clock className="w-4 h-4" />
          <span className="font-medium tabular-nums">{currentTime}</span>
        </div>

        {/* Notification bell */}
        <div ref={notifRef} className="relative">
          <button
            onClick={handleNotifToggle}
            className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Bildirimler"
          >
            <Bell className="w-5 h-5 text-gray-600" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold text-white bg-red-500 rounded-full px-1 leading-none">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notification dropdown */}
          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">Bildirimler</h3>
                {unreadCount > 0 && (
                  <span className="text-xs text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">
                    {unreadCount} yeni
                  </span>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto">
                {notifLoading ? (
                  <div className="px-4 py-8 text-center text-sm text-gray-400">
                    Yukleniyor...
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-gray-400">
                    Bildirim bulunmuyor
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <button
                      key={notif.id}
                      onClick={() => !notif.isRead && handleMarkAsRead(notif.id)}
                      className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors flex gap-3 ${
                        !notif.isRead ? 'bg-blue-50/40' : ''
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${notificationTypeIcon(notif.type)}`}>
                        <Bell className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm truncate ${!notif.isRead ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                            {notif.title}
                          </p>
                          {notif.isRead && (
                            <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate">{notif.message}</p>
                        <p className="text-[11px] text-gray-400 mt-1">{timeAgo(notif.createdAt)}</p>
                      </div>
                      {!notif.isRead && (
                        <div className="w-2 h-2 bg-primary-500 rounded-full flex-shrink-0 mt-2"></div>
                      )}
                    </button>
                  ))
                )}
              </div>

              <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50">
                <a
                  href="/dashboard/notifications"
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center justify-center"
                >
                  Tumunu Gor
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-gray-200"></div>

        {/* User avatar and dropdown */}
        <div ref={userMenuRef} className="relative">
          <button
            onClick={handleUserMenuToggle}
            className="flex items-center gap-2 p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Kullanici menusu"
          >
            <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-primary-700">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </span>
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium text-gray-900 leading-tight">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-[11px] text-gray-500 leading-tight">
                {user?.role ? roleLabels[user.role] : ''}
              </p>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400 hidden md:block" />
          </button>

          {/* User dropdown */}
          {userMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-900">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{user?.email}</p>
                <span className="inline-block mt-1.5 text-[10px] font-medium text-primary-700 bg-primary-50 px-2 py-0.5 rounded-full">
                  {user?.role ? roleLabels[user.role] : ''}
                </span>
              </div>

              <div className="py-1">
                <a
                  href="/dashboard/profile"
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <User className="w-4 h-4 text-gray-400" />
                  Profil
                </a>
              </div>

              <div className="border-t border-gray-100 py-1">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Cikis Yap
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
