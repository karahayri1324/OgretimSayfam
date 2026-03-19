// Kullanıcı Rolleri
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  SCHOOL_ADMIN = 'SCHOOL_ADMIN',
  TEACHER = 'TEACHER',
  STUDENT = 'STUDENT',
  PARENT = 'PARENT',
}

// Yoklama Durumları
export enum AttendanceStatus {
  PRESENT = 'PRESENT',       // Geldi
  ABSENT = 'ABSENT',         // Gelmedi
  LATE = 'LATE',             // Geç kaldı
  EXCUSED = 'EXCUSED',       // İzinli
}

// Ödev Durumları
export enum AssignmentStatus {
  PENDING = 'PENDING',       // Bekliyor
  SUBMITTED = 'SUBMITTED',   // Teslim edildi
  GRADED = 'GRADED',         // Notlandı
  LATE = 'LATE',             // Geç teslim
  MISSING = 'MISSING',       // Teslim edilmedi
}

// Duyuru Kategorileri
export enum AnnouncementCategory {
  GENERAL = 'GENERAL',       // Genel
  URGENT = 'URGENT',         // Acil
  EVENT = 'EVENT',           // Etkinlik
  EXAM = 'EXAM',             // Sınav
}

// Duyuru Hedef Kitlesi
export enum AnnouncementTarget {
  ALL = 'ALL',               // Tüm okul
  TEACHERS = 'TEACHERS',     // Öğretmenler
  STUDENTS = 'STUDENTS',     // Öğrenciler
  PARENTS = 'PARENTS',       // Veliler
  CLASS = 'CLASS',           // Belirli sınıf
}

// Not Kategorileri
export enum GradeCategory {
  EXAM = 'EXAM',             // Yazılı sınav
  ORAL = 'ORAL',             // Sözlü
  HOMEWORK = 'HOMEWORK',     // Ödev
  PROJECT = 'PROJECT',       // Proje
  PERFORMANCE = 'PERFORMANCE', // Performans
}

// Gün enum
export enum DayOfWeek {
  MONDAY = 'MONDAY',
  TUESDAY = 'TUESDAY',
  WEDNESDAY = 'WEDNESDAY',
  THURSDAY = 'THURSDAY',
  FRIDAY = 'FRIDAY',
  SATURDAY = 'SATURDAY',
  SUNDAY = 'SUNDAY',
}

// Etkinlik Türleri
export enum EventType {
  TRIP = 'TRIP',             // Gezi
  CEREMONY = 'CEREMONY',     // Tören
  MEETING = 'MEETING',       // Toplantı
  SPORTS = 'SPORTS',         // Sportif
  CULTURAL = 'CULTURAL',     // Kültürel
  OTHER = 'OTHER',           // Diğer
}

// Ders Saati Slotu
export interface TimeSlot {
  slotNumber: number;
  startTime: string;  // "08:30"
  endTime: string;    // "09:10"
}

// API Yanıt Yapısı
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Sayfalama
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// JWT Payload
export interface JwtPayload {
  sub: string;       // userId
  email: string;
  role: UserRole;
  schoolId?: string;
}
