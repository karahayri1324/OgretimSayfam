
export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  SCHOOL_ADMIN = 'SCHOOL_ADMIN',
  TEACHER = 'TEACHER',
  STUDENT = 'STUDENT',
  PARENT = 'PARENT',
}

export enum AttendanceStatus {
  PRESENT = 'PRESENT',       
  ABSENT = 'ABSENT',         
  LATE = 'LATE',             
  EXCUSED = 'EXCUSED',       
}

export enum AssignmentStatus {
  PENDING = 'PENDING',       
  SUBMITTED = 'SUBMITTED',   
  GRADED = 'GRADED',         
  LATE = 'LATE',             
  MISSING = 'MISSING',       
}

export enum AnnouncementCategory {
  GENERAL = 'GENERAL',       
  URGENT = 'URGENT',         
  EVENT = 'EVENT',           
  EXAM = 'EXAM',             
}

export enum AnnouncementTarget {
  ALL = 'ALL',               
  TEACHERS = 'TEACHERS',     
  STUDENTS = 'STUDENTS',     
  PARENTS = 'PARENTS',       
  CLASS = 'CLASS',           
}

export enum GradeCategory {
  EXAM = 'EXAM',             
  ORAL = 'ORAL',             
  HOMEWORK = 'HOMEWORK',     
  PROJECT = 'PROJECT',       
  PERFORMANCE = 'PERFORMANCE', 
}

export enum DayOfWeek {
  MONDAY = 'MONDAY',
  TUESDAY = 'TUESDAY',
  WEDNESDAY = 'WEDNESDAY',
  THURSDAY = 'THURSDAY',
  FRIDAY = 'FRIDAY',
  SATURDAY = 'SATURDAY',
  SUNDAY = 'SUNDAY',
}

export enum EventType {
  TRIP = 'TRIP',             
  CEREMONY = 'CEREMONY',     
  MEETING = 'MEETING',       
  SPORTS = 'SPORTS',         
  CULTURAL = 'CULTURAL',     
  OTHER = 'OTHER',           
}

export interface TimeSlot {
  slotNumber: number;
  startTime: string;  
  endTime: string;    
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface JwtPayload {
  sub: string;       
  email: string;
  role: UserRole;
  schoolId?: string;
}
