import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import axios from 'axios';

interface FetActivity {
  id: string;
  teacherId: string;
  teacherName: string;
  subjectId: string;
  subjectName: string;
  classId: string;
  className: string;
  duration: number;
  totalDuration: number;
  roomId?: string;
  roomName?: string;
}

@Injectable()
export class FetIntegrationService {
  private readonly logger = new Logger(FetIntegrationService.name);
  private fetServiceUrl: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.fetServiceUrl = this.configService.get('FET_SERVICE_URL') || 'http://localhost:3002';
  }

  /**
   * Check if FET service is healthy
   */
  async checkHealth(): Promise<{ ok: boolean; fetClAvailable: boolean }> {
    try {
      const { data } = await axios.get(`${this.fetServiceUrl}/health`, { timeout: 5000 });
      return { ok: data.status === 'ok', fetClAvailable: data.fetClAvailable };
    } catch {
      return { ok: false, fetClAvailable: false };
    }
  }

  /**
   * Gather all school data needed for FET timetable generation
   */
  async gatherSchoolData(schoolId: string) {
    // Get all active teachers with profiles
    const teacherUsers = await this.prisma.user.findMany({
      where: { schoolId, role: 'TEACHER', isActive: true },
      include: { teacherProfile: true },
    });

    const teachers = teacherUsers
      .filter(u => u.teacherProfile)
      .map(u => ({
        id: u.teacherProfile!.id,
        name: `${u.firstName} ${u.lastName}`,
      }));

    // Get all active subjects
    const subjects = await this.prisma.subject.findMany({
      where: { schoolId, isActive: true },
      select: { id: true, name: true, code: true, color: true },
    });

    // Get all active classes
    const classes = await this.prisma.class.findMany({
      where: { schoolId, isActive: true },
      select: { id: true, name: true, grade: true, section: true, capacity: true },
    });

    // Get all active classrooms
    const classrooms = await this.prisma.classroom.findMany({
      where: { schoolId, isActive: true },
      select: { id: true, name: true, capacity: true, type: true },
    });

    // Get teacher assignments (which teacher teaches which subject in which class)
    const assignments = await this.prisma.teacherAssignment.findMany({
      where: {
        teacherProfile: { user: { schoolId } },
      },
      include: {
        teacherProfile: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
        class: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
      },
    });

    // Get time slots
    const timeSlots = await this.prisma.timeSlot.findMany({
      where: { schoolId },
      orderBy: { slotNumber: 'asc' },
    });

    return { teachers, subjects, classes, classrooms, assignments, timeSlots };
  }

  /**
   * Build FET activities from teacher assignments
   */
  buildActivities(assignments: any[]): FetActivity[] {
    const activities: FetActivity[] = [];

    for (const assignment of assignments) {
      const teacherName = `${assignment.teacherProfile.user.firstName} ${assignment.teacherProfile.user.lastName}`;
      const hoursPerWeek = assignment.hoursPerWeek || 4;

      // Split into individual activities (each 1 hour)
      for (let i = 0; i < hoursPerWeek; i++) {
        activities.push({
          id: `${assignment.id}_${i}`,
          teacherId: assignment.teacherProfile.id,
          teacherName,
          subjectId: assignment.subject.id,
          subjectName: assignment.subject.name,
          classId: assignment.class.id,
          className: assignment.class.name,
          duration: 1,
          totalDuration: hoursPerWeek,
        });
      }
    }

    return activities;
  }

  /**
   * Start timetable generation via FET service
   */
  async generateTimetable(schoolId: string, constraints?: any): Promise<{
    success: boolean;
    jobId?: string;
    error?: string;
  }> {
    const schoolData = await this.gatherSchoolData(schoolId);
    const activities = this.buildActivities(schoolData.assignments);

    if (activities.length === 0) {
      return {
        success: false,
        error: 'Ders programı oluşturmak için öğretmen ataması bulunamadı. Önce öğretmen atamalarını yapın.',
      };
    }

    // Build hour names from time slots
    const hourNames = schoolData.timeSlots.map(ts => `${ts.slotNumber}. Ders`);

    const payload = {
      schoolId,
      teachers: schoolData.teachers,
      subjects: schoolData.subjects.map(s => ({ id: s.id, name: s.name })),
      classes: schoolData.classes.map(c => ({ id: c.id, name: c.name, capacity: c.capacity })),
      rooms: schoolData.classrooms.map(r => ({ id: r.id, name: r.name, capacity: r.capacity })),
      activities,
      constraints: constraints || {},
      hoursCount: schoolData.timeSlots.length || 8,
      hourNames: hourNames.length > 0 ? hourNames : undefined,
    };

    try {
      const { data } = await axios.post(
        `${this.fetServiceUrl}/api/fet/generate`,
        payload,
        { timeout: 10000 },
      );

      if (data.success) {
        return { success: true, jobId: data.jobId };
      }
      return { success: false, error: data.message };
    } catch (error: any) {
      this.logger.error('FET service call failed', error.message);
      return {
        success: false,
        error: 'FET servisine bağlanılamadı. Servisin çalıştığından emin olun.',
      };
    }
  }

  /**
   * Start synchronous timetable generation
   */
  async generateTimetableSync(schoolId: string, constraints?: any): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    const schoolData = await this.gatherSchoolData(schoolId);
    const activities = this.buildActivities(schoolData.assignments);

    if (activities.length === 0) {
      return {
        success: false,
        error: 'Ders programı oluşturmak için öğretmen ataması bulunamadı.',
      };
    }

    const hourNames = schoolData.timeSlots.map(ts => `${ts.slotNumber}. Ders`);

    const payload = {
      schoolId,
      teachers: schoolData.teachers,
      subjects: schoolData.subjects.map(s => ({ id: s.id, name: s.name })),
      classes: schoolData.classes.map(c => ({ id: c.id, name: c.name, capacity: c.capacity })),
      rooms: schoolData.classrooms.map(r => ({ id: r.id, name: r.name, capacity: r.capacity })),
      activities,
      constraints: constraints || {},
      hoursCount: schoolData.timeSlots.length || 8,
      hourNames: hourNames.length > 0 ? hourNames : undefined,
    };

    try {
      const { data } = await axios.post(
        `${this.fetServiceUrl}/api/fet/generate-sync`,
        payload,
        { timeout: 600000 }, // 10 min timeout for sync generation
      );

      return data;
    } catch (error: any) {
      this.logger.error('FET sync generation failed', error.message);
      return {
        success: false,
        error: 'FET servisine bağlanılamadı: ' + error.message,
      };
    }
  }

  /**
   * Check job status
   */
  async checkJobStatus(jobId: string): Promise<any> {
    try {
      const { data } = await axios.get(
        `${this.fetServiceUrl}/api/fet/status/${jobId}`,
        { timeout: 5000 },
      );
      return data;
    } catch (error: any) {
      return { success: false, error: 'FET servisine bağlanılamadı' };
    }
  }

  /**
   * Get job result
   */
  async getJobResult(jobId: string): Promise<any> {
    try {
      const { data } = await axios.get(
        `${this.fetServiceUrl}/api/fet/result/${jobId}`,
        { timeout: 5000 },
      );
      return data;
    } catch (error: any) {
      return { success: false, error: 'FET servisine bağlanılamadı' };
    }
  }

  /**
   * Import FET result into database timetable entries
   */
  async importFetResult(schoolId: string, fetEntries: any[]) {
    const schoolData = await this.gatherSchoolData(schoolId);

    // Build lookup maps
    const teacherMap = new Map<string, string>();
    for (const a of schoolData.assignments) {
      const name = `${a.teacherProfile.user.firstName} ${a.teacherProfile.user.lastName}`;
      teacherMap.set(name, a.teacherProfile.id);
    }

    const subjectMap = new Map<string, string>();
    for (const s of schoolData.subjects) {
      subjectMap.set(s.name, s.id);
    }

    const classMap = new Map<string, string>();
    for (const c of schoolData.classes) {
      classMap.set(c.name, c.id);
    }

    const classroomMap = new Map<string, string>();
    for (const r of schoolData.classrooms) {
      classroomMap.set(r.name, r.id);
    }

    const timeSlotMap = new Map<number, string>();
    for (const ts of schoolData.timeSlots) {
      timeSlotMap.set(ts.slotNumber, ts.id);
    }

    const dayMap: Record<string, string> = {
      'Pazartesi': 'MONDAY',
      'Salı': 'TUESDAY',
      'Çarşamba': 'WEDNESDAY',
      'Perşembe': 'THURSDAY',
      'Cuma': 'FRIDAY',
      'Monday': 'MONDAY',
      'Tuesday': 'TUESDAY',
      'Wednesday': 'WEDNESDAY',
      'Thursday': 'THURSDAY',
      'Friday': 'FRIDAY',
    };

    // Clear existing timetable for this school's classes
    for (const cls of schoolData.classes) {
      await this.prisma.timetableEntry.deleteMany({ where: { classId: cls.id } });
    }

    // Import entries
    const imported: any[] = [];
    const errors: string[] = [];

    for (const entry of fetEntries) {
      const classId = classMap.get(entry.students || entry.class);
      const subjectId = subjectMap.get(entry.subject);
      const teacherId = teacherMap.get(entry.teacher);
      const dayOfWeek = dayMap[entry.day] || dayMap[entry.dayOfWeek];

      // Get time slot - hourIndex is 0-based, slotNumber is 1-based
      const slotNumber = (entry.hourIndex ?? entry.slotNumber ?? 0) + 1;
      const timeSlotId = timeSlotMap.get(slotNumber);

      if (!classId || !subjectId || !timeSlotId || !dayOfWeek) {
        errors.push(
          `Eşleştirilemedi: ${entry.subject || '?'} - ${entry.students || '?'} - ${entry.teacher || '?'} (Gün: ${entry.day}, Saat: ${slotNumber})`
        );
        continue;
      }

      const classroomId = entry.room ? classroomMap.get(entry.room) : undefined;

      try {
        const created = await this.prisma.timetableEntry.create({
          data: {
            classId,
            subjectId,
            timeSlotId,
            dayOfWeek: dayOfWeek as any,
            teacherId: teacherId || undefined,
            classroomId: classroomId || undefined,
          },
        });
        imported.push(created);
      } catch (err: any) {
        errors.push(`Kayıt hatası: ${entry.subject} - ${entry.students} - ${err.message}`);
      }
    }

    return {
      importedCount: imported.length,
      errorCount: errors.length,
      errors: errors.slice(0, 20),
    };
  }

  /**
   * Get preview data for FET generation (what will be sent to FET)
   */
  async getPreviewData(schoolId: string) {
    const schoolData = await this.gatherSchoolData(schoolId);
    const activities = this.buildActivities(schoolData.assignments);

    return {
      teachers: schoolData.teachers,
      subjects: schoolData.subjects,
      classes: schoolData.classes,
      classrooms: schoolData.classrooms,
      activities: activities.length,
      assignmentsCount: schoolData.assignments.length,
      timeSlotsCount: schoolData.timeSlots.length,
      assignments: schoolData.assignments.map(a => ({
        teacher: `${a.teacherProfile.user.firstName} ${a.teacherProfile.user.lastName}`,
        subject: a.subject.name,
        class: a.class.name,
        hoursPerWeek: a.hoursPerWeek,
      })),
    };
  }
}
