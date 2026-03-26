'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Users, School, BookOpen, Calendar, ClipboardCheck,
  GraduationCap, FileText, Bell, BookMarked, UserCheck, CalendarDays,
  Settings, LogOut, ChevronLeft, Menu, Building2, DoorOpen, CalendarRange, BarChart3
} from 'lucide-react';
import { useState } from 'react';

const menuItems: Record<string, { label: string; href: string; icon: any }[]> = {
  SUPER_ADMIN: [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Okullar', href: '/dashboard/schools', icon: Building2 },
    { label: 'Kullanıcılar', href: '/dashboard/users', icon: Users },
    { label: 'Sınıflar', href: '/dashboard/classes', icon: School },
    { label: 'Derslikler', href: '/dashboard/classrooms', icon: DoorOpen },
    { label: 'Akademik Yıl', href: '/dashboard/academic-years', icon: CalendarRange },
    { label: 'Dersler', href: '/dashboard/subjects', icon: BookOpen },
    { label: 'Ders Programı', href: '/dashboard/timetable', icon: Calendar },
    { label: 'Yoklama', href: '/dashboard/attendance', icon: ClipboardCheck },
    { label: 'Devamsızlık Raporu', href: '/dashboard/attendance-report', icon: BarChart3 },
    { label: 'Notlar', href: '/dashboard/grades', icon: GraduationCap },
    { label: 'Duyurular', href: '/dashboard/announcements', icon: Bell },
    { label: 'Etkinlikler', href: '/dashboard/events', icon: CalendarDays },
    { label: 'Sınıf Defteri', href: '/dashboard/class-diary', icon: BookMarked },
    { label: 'Vekil Öğretmen', href: '/dashboard/substitutions', icon: UserCheck },
    { label: 'Profil', href: '/dashboard/profile', icon: Settings },
  ],
  SCHOOL_ADMIN: [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Kullanıcılar', href: '/dashboard/users', icon: Users },
    { label: 'Sınıflar', href: '/dashboard/classes', icon: School },
    { label: 'Derslikler', href: '/dashboard/classrooms', icon: DoorOpen },
    { label: 'Akademik Yıl', href: '/dashboard/academic-years', icon: CalendarRange },
    { label: 'Dersler', href: '/dashboard/subjects', icon: BookOpen },
    { label: 'Ders Programı', href: '/dashboard/timetable', icon: Calendar },
    { label: 'Yoklama', href: '/dashboard/attendance', icon: ClipboardCheck },
    { label: 'Devamsızlık Raporu', href: '/dashboard/attendance-report', icon: BarChart3 },
    { label: 'Notlar', href: '/dashboard/grades', icon: GraduationCap },
    { label: 'Duyurular', href: '/dashboard/announcements', icon: Bell },
    { label: 'Etkinlikler', href: '/dashboard/events', icon: CalendarDays },
    { label: 'Sınıf Defteri', href: '/dashboard/class-diary', icon: BookMarked },
    { label: 'Vekil Öğretmen', href: '/dashboard/substitutions', icon: UserCheck },
    { label: 'Profil', href: '/dashboard/profile', icon: Settings },
  ],
  TEACHER: [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Sınıflar', href: '/dashboard/classes', icon: School },
    { label: 'Dersler', href: '/dashboard/subjects', icon: BookOpen },
    { label: 'Ders Programım', href: '/dashboard/timetable', icon: Calendar },
    { label: 'Yoklama', href: '/dashboard/attendance', icon: ClipboardCheck },
    { label: 'Devamsızlık Raporu', href: '/dashboard/attendance-report', icon: BarChart3 },
    { label: 'Notlar', href: '/dashboard/grades', icon: GraduationCap },
    { label: 'Ödevler', href: '/dashboard/assignments', icon: FileText },
    { label: 'Duyurular', href: '/dashboard/announcements', icon: Bell },
    { label: 'Etkinlikler', href: '/dashboard/events', icon: CalendarDays },
    { label: 'Sınıf Defteri', href: '/dashboard/class-diary', icon: BookMarked },
    { label: 'Vekil Öğretmen', href: '/dashboard/substitutions', icon: UserCheck },
    { label: 'Profil', href: '/dashboard/profile', icon: Settings },
  ],
  STUDENT: [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Ders Programım', href: '/dashboard/timetable', icon: Calendar },
    { label: 'Notlarım', href: '/dashboard/grades', icon: GraduationCap },
    { label: 'Ödevlerim', href: '/dashboard/assignments', icon: FileText },
    { label: 'Duyurular', href: '/dashboard/announcements', icon: Bell },
    { label: 'Etkinlikler', href: '/dashboard/events', icon: CalendarDays },
    { label: 'Profil', href: '/dashboard/profile', icon: Settings },
  ],
  PARENT: [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Ders Programı', href: '/dashboard/timetable', icon: Calendar },
    { label: 'Notlar', href: '/dashboard/grades', icon: GraduationCap },
    { label: 'Ödevler', href: '/dashboard/assignments', icon: FileText },
    { label: 'Duyurular', href: '/dashboard/announcements', icon: Bell },
    { label: 'Etkinlikler', href: '/dashboard/events', icon: CalendarDays },
    { label: 'Profil', href: '/dashboard/profile', icon: Settings },
  ],
};

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  if (!user) return null;

  const items = menuItems[user.role] || [];

  return (
    <aside className={cn(
      'h-screen bg-white border-r border-gray-200 flex flex-col transition-all duration-300',
      collapsed ? 'w-16' : 'w-64',
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary-600" />
            </div>
            <span className="font-bold text-gray-900 text-sm">ÖğretimSayfam</span>
          </div>
        )}
        <button onClick={() => setCollapsed(!collapsed)} className="p-1 hover:bg-gray-100 rounded-lg">
          {collapsed ? <Menu className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                isActive
                  ? 'bg-primary-50 text-primary-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
              )}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User info & Logout */}
      <div className="border-t border-gray-100 p-3">
        {!collapsed && (
          <div className="mb-2 px-2">
            <p className="text-sm font-medium text-gray-900 truncate">{user.firstName} {user.lastName}</p>
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
          </div>
        )}
        <button
          onClick={async () => { await logout(); router.push('/login'); }}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 w-full transition-colors"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Çıkış Yap</span>}
        </button>
      </div>
    </aside>
  );
}
