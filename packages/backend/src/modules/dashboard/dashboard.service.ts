import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private prisma: PrismaService) {}

  async getAdminDashboard(schoolId: string) {
    const [teacherCount, studentCount, classCount, subjectCount] = await Promise.all([
      this.prisma.user.count({ where: { schoolId, role: 'TEACHER', isActive: true } }),
      this.prisma.user.count({ where: { schoolId, role: 'STUDENT', isActive: true } }),
      this.prisma.class.count({ where: { schoolId, isActive: true } }),
      this.prisma.subject.count({ where: { schoolId, isActive: true } }),
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayAbsentTeachers, todaySubstitutions, todayAttendancePresent, todayAttendanceAbsent, recentAnnouncements, upcomingEvents] = await Promise.all([
      this.prisma.teacherAttendance.count({
        where: { date: today, isPresent: false, teacherProfile: { user: { schoolId } } },
      }),
      this.prisma.substitution.count({
        where: { date: today, originalTeacher: { user: { schoolId } } },
      }),
      this.prisma.attendance.count({
        where: {
          date: today,
          status: 'PRESENT',
          studentProfile: { user: { schoolId } },
        },
      }).catch(() => 0),
      this.prisma.attendance.count({
        where: {
          date: today,
          status: 'ABSENT',
          studentProfile: { user: { schoolId } },
        },
      }).catch(() => 0),
      this.prisma.announcement.findMany({
        where: { schoolId, isActive: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, title: true, category: true, createdAt: true },
      }),
      this.prisma.event.findMany({
        where: { schoolId, isActive: true, startDate: { gte: new Date() } },
        orderBy: { startDate: 'asc' },
        take: 5,
        select: { id: true, title: true, type: true, startDate: true },
      }),
    ]);

    return {
      stats: {
        teacherCount,
        studentCount,
        classCount,
        subjectCount,
        todayAbsentTeachers,
        todaySubstitutions,
        todayAttendancePresent,
        todayAttendanceAbsent,
      },
      recentAnnouncements,
      upcomingEvents,
    };
  }

  async getTeacherDashboard(teacherProfileId: string | undefined, schoolId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const dayIndex = today.getDay();
    const dayOfWeek = dayNames[dayIndex];
    const isWeekend = dayIndex === 0 || dayIndex === 6;

    if (!teacherProfileId) {
      return {
        todayClasses: [],
        timeSlots: [],
        activeAssignments: 0,
        recentAnnouncements: [],
        isWeekend,
        dayOfWeek,
      };
    }

    const [todayClasses, timeSlots, assignments, announcements, pendingDiaryCount] = await Promise.all([
      isWeekend ? Promise.resolve([]) : this.prisma.timetableEntry.findMany({
        where: { teacherId: teacherProfileId, dayOfWeek: dayOfWeek as any },
        include: {
          class: { select: { name: true } },
          subject: { select: { name: true, color: true } },
          timeSlot: true,
          classroom: { select: { name: true } },
        },
        orderBy: { timeSlot: { slotNumber: 'asc' } },
      }),
      this.prisma.timeSlot.findMany({
        where: { schoolId },
        orderBy: { slotNumber: 'asc' },
      }),
      this.prisma.assignment.count({
        where: {
          subject: { teacherAssignments: { some: { teacherProfileId } } },
          dueDate: { gte: today },
        },
      }),
      this.prisma.announcement.findMany({
        where: { schoolId, isActive: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, title: true, category: true, createdAt: true },
      }),
      this.prisma.classDiaryEntry.count({
        where: {
          teacherProfileId,
          isApproved: false,
        },
      }).catch(() => 0),
    ]);

    // Count weekly hours
    const weeklyEntries = isWeekend ? [] : await this.prisma.timetableEntry.findMany({
      where: { teacherId: teacherProfileId },
      select: { id: true },
    });

    return {
      todayClasses,
      timeSlots,
      activeAssignments: assignments,
      weeklyHours: weeklyEntries.length,
      pendingDiaryCount,
      recentAnnouncements: announcements,
      isWeekend,
      dayOfWeek,
    };
  }

  async getStudentDashboard(studentProfileId: string | undefined, classId: string | undefined, schoolId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const dayIndex = today.getDay();
    const dayOfWeek = dayNames[dayIndex];
    const isWeekend = dayIndex === 0 || dayIndex === 6;

    if (!studentProfileId || !classId) {
      return {
        todayClasses: [],
        pendingAssignments: [],
        recentGrades: [],
        recentAnnouncements: [],
        isWeekend,
        dayOfWeek,
      };
    }

    const [todayClasses, timeSlots, pendingAssignments, recentGrades, announcements, absenceCount] = await Promise.all([
      isWeekend ? Promise.resolve([]) : this.prisma.timetableEntry.findMany({
        where: { classId, dayOfWeek: dayOfWeek as any },
        include: {
          subject: { select: { name: true, color: true } },
          timeSlot: true,
          classroom: { select: { name: true } },
        },
        orderBy: { timeSlot: { slotNumber: 'asc' } },
      }),
      this.prisma.timeSlot.findMany({
        where: { schoolId },
        orderBy: { slotNumber: 'asc' },
      }),
      this.prisma.assignment.findMany({
        where: {
          classId,
          dueDate: { gte: today },
          submissions: { none: { studentProfileId } },
        },
        include: { subject: { select: { name: true } } },
        orderBy: { dueDate: 'asc' },
        take: 5,
      }),
      this.prisma.grade.findMany({
        where: { studentProfileId },
        include: { subject: { select: { name: true } }, category: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.prisma.announcement.findMany({
        where: {
          schoolId,
          isActive: true,
          OR: [
            { targetClasses: { none: {} } },
            { targetClasses: { some: { classId } } },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, title: true, category: true, createdAt: true },
      }),
      this.prisma.attendance.count({
        where: {
          studentProfileId,
          status: 'ABSENT',
        },
      }).catch(() => 0),
    ]);

    // Calculate grade average
    const gradeAverage = recentGrades.length > 0
      ? recentGrades.reduce((sum: number, g: any) => sum + g.score, 0) / recentGrades.length
      : 0;

    return {
      todayClasses,
      timeSlots,
      pendingAssignments,
      recentGrades,
      gradeAverage: Math.round(gradeAverage * 10) / 10,
      absenceCount,
      recentAnnouncements: announcements,
      isWeekend,
      dayOfWeek,
    };
  }

  async getParentDashboard(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const dayIndex = today.getDay();
    const dayOfWeek = dayNames[dayIndex];
    const isWeekend = dayIndex === 0 || dayIndex === 6;

    // Find parent profile and linked children
    const parentProfile = await this.prisma.parentProfile.findUnique({
      where: { userId },
      include: {
        parentStudents: {
          include: {
            student: {
              include: {
                user: { select: { firstName: true, lastName: true } },
                class: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    if (!parentProfile || parentProfile.parentStudents.length === 0) {
      return {
        children: [],
        recentAnnouncements: [],
        isWeekend,
        dayOfWeek,
      };
    }

    // Get schoolId from the first child's user
    const firstStudentUserId = parentProfile.parentStudents[0].student.userId;
    const firstStudentUser = await this.prisma.user.findUnique({
      where: { id: firstStudentUserId },
      select: { schoolId: true },
    });
    const schoolId = firstStudentUser?.schoolId;

    // Fetch data for each child
    const children = await Promise.all(
      parentProfile.parentStudents.map(async (ps) => {
        const student = ps.student;
        const classId = student.classId;
        const studentProfileId = student.id;

        const [todayClasses, timeSlots, recentGrades, absenceCount, pendingAssignments] = await Promise.all([
          isWeekend || !classId
            ? Promise.resolve([])
            : this.prisma.timetableEntry.findMany({
                where: { classId, dayOfWeek: dayOfWeek as any },
                include: {
                  subject: { select: { name: true, color: true } },
                  timeSlot: true,
                  classroom: { select: { name: true } },
                },
                orderBy: { timeSlot: { slotNumber: 'asc' } },
              }),
          schoolId
            ? this.prisma.timeSlot.findMany({
                where: { schoolId },
                orderBy: { slotNumber: 'asc' },
              })
            : Promise.resolve([]),
          this.prisma.grade.findMany({
            where: { studentProfileId },
            include: {
              subject: { select: { name: true } },
              category: { select: { name: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
          }),
          this.prisma.attendance.count({
            where: { studentProfileId, status: 'ABSENT' },
          }).catch(() => 0),
          classId
            ? this.prisma.assignment.findMany({
                where: {
                  classId,
                  dueDate: { gte: today },
                  submissions: { none: { studentProfileId } },
                },
                include: { subject: { select: { name: true } } },
                orderBy: { dueDate: 'asc' },
                take: 5,
              })
            : Promise.resolve([]),
        ]);

        const gradeAverage =
          recentGrades.length > 0
            ? recentGrades.reduce((sum: number, g: any) => sum + g.score, 0) / recentGrades.length
            : 0;

        return {
          id: studentProfileId,
          firstName: student.user.firstName,
          lastName: student.user.lastName,
          className: student.class?.name || '-',
          todayClasses,
          timeSlots,
          recentGrades,
          absenceCount,
          pendingAssignments,
          gradeAverage: Math.round(gradeAverage * 10) / 10,
        };
      }),
    );

    // Fetch announcements for the school
    const recentAnnouncements = schoolId
      ? await this.prisma.announcement.findMany({
          where: { schoolId, isActive: true },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: { id: true, title: true, category: true, createdAt: true },
        })
      : [];

    return {
      children,
      recentAnnouncements,
      isWeekend,
      dayOfWeek,
    };
  }
}
