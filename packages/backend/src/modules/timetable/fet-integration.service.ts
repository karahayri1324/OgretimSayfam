import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import axios from 'axios';
import { DayOfWeek, Prisma } from '@prisma/client';

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

  private fetSharedSecret: string | undefined;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.fetServiceUrl = this.configService.get('FET_SERVICE_URL') || 'http://localhost:3002';
    this.fetSharedSecret = this.configService.get<string>('FET_SHARED_SECRET') || undefined;
  }

  private fetHeaders(): Record<string, string> {
    return this.fetSharedSecret ? { 'X-Fet-Secret': this.fetSharedSecret } : {};
  }

  async checkHealth(): Promise<{ ok: boolean; fetClAvailable: boolean }> {
    try {
      const { data } = await axios.get(`${this.fetServiceUrl}/health`, { timeout: 5000 });
      return { ok: data.status === 'ok', fetClAvailable: data.fetClAvailable };
    } catch (err: any) {
      this.logger.warn(`FET health check başarısız: ${err?.message || err}`);
      return { ok: false, fetClAvailable: false };
    }
  }

  async gatherSchoolData(schoolId: string) {
    
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

    const subjects = await this.prisma.subject.findMany({
      where: { schoolId, isActive: true },
      select: { id: true, name: true, code: true, color: true },
    });

    const classes = await this.prisma.class.findMany({
      where: { schoolId, isActive: true },
      select: { id: true, name: true, grade: true, section: true, capacity: true },
    });

    const classrooms = await this.prisma.classroom.findMany({
      where: { schoolId, isActive: true },
      select: { id: true, name: true, capacity: true, type: true },
    });

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

    const timeSlots = await this.prisma.timeSlot.findMany({
      where: { schoolId },
      orderBy: { slotNumber: 'asc' },
    });

    return { teachers, subjects, classes, classrooms, assignments, timeSlots };
  }

  buildActivities(assignments: any[]): FetActivity[] {
    const activities: FetActivity[] = [];

    for (const assignment of assignments) {
      const teacherName = `${assignment.teacherProfile.user.firstName} ${assignment.teacherProfile.user.lastName}`;
      const raw = assignment.hoursPerWeek;
      const hoursPerWeek = Number.isFinite(raw) && raw >= 1 && raw <= 40 ? raw : 4;

      if (!Number.isFinite(raw) || raw < 1) {
        this.logger.warn(
          `Öğretmen ataması ${assignment.id} için geçersiz hoursPerWeek=${raw}, varsayılan 4 kullanılıyor`,
        );
      }

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
        { timeout: 10000, headers: this.fetHeaders() },
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
        { timeout: 600000, headers: this.fetHeaders() },
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

  async checkJobStatus(jobId: string): Promise<any> {
    try {
      const { data } = await axios.get(
        `${this.fetServiceUrl}/api/fet/status/${jobId}`,
        { timeout: 5000, headers: this.fetHeaders() },
      );
      return data;
    } catch (error: any) {
      this.logger.warn(`FET status kontrol hatası (${jobId}): ${error?.message || error}`);
      return { success: false, error: 'FET servisine bağlanılamadı' };
    }
  }

  async getJobResult(jobId: string): Promise<any> {
    try {
      const { data } = await axios.get(
        `${this.fetServiceUrl}/api/fet/result/${jobId}`,
        { timeout: 5000, headers: this.fetHeaders() },
      );
      return data;
    } catch (error: any) {
      this.logger.warn(`FET result hatası (${jobId}): ${error?.message || error}`);
      return { success: false, error: 'FET servisine bağlanılamadı' };
    }
  }

  async importFetResult(schoolId: string, fetEntries: any[]) {
    if (!Array.isArray(fetEntries) || fetEntries.length === 0) {
      throw new BadRequestException('İçe aktarılacak kayıt bulunamadı');
    }

    const schoolData = await this.gatherSchoolData(schoolId);

    const teacherMap = new Map<string, string>();
    for (const a of schoolData.assignments) {
      const name = `${a.teacherProfile.user.firstName} ${a.teacherProfile.user.lastName}`;
      teacherMap.set(name, a.teacherProfile.id);
    }

    const subjectMap = new Map<string, string>();
    for (const s of schoolData.subjects) subjectMap.set(s.name, s.id);

    const classMap = new Map<string, string>();
    for (const c of schoolData.classes) classMap.set(c.name, c.id);

    const classroomMap = new Map<string, string>();
    for (const r of schoolData.classrooms) classroomMap.set(r.name, r.id);

    const timeSlotMap = new Map<number, string>();
    const validSlotNumbers = new Set<number>();
    for (const ts of schoolData.timeSlots) {
      timeSlotMap.set(ts.slotNumber, ts.id);
      validSlotNumbers.add(ts.slotNumber);
    }

    const dayMap: Record<string, DayOfWeek> = {
      Pazartesi: 'MONDAY',
      'Salı': 'TUESDAY',
      'Çarşamba': 'WEDNESDAY',
      'Perşembe': 'THURSDAY',
      Cuma: 'FRIDAY',
      Monday: 'MONDAY',
      Tuesday: 'TUESDAY',
      Wednesday: 'WEDNESDAY',
      Thursday: 'THURSDAY',
      Friday: 'FRIDAY',
    };

    const toCreate: Prisma.TimetableEntryCreateManyInput[] = [];
    const errors: string[] = [];

    for (const entry of fetEntries) {
      const classId = classMap.get(entry.students || entry.class);
      const subjectId = subjectMap.get(entry.subject);
      const teacherId = teacherMap.get(entry.teacher);
      const dayOfWeek = dayMap[entry.day] || dayMap[entry.dayOfWeek];

      const rawIndex = entry.hourIndex ?? entry.slotNumber;
      if (!Number.isInteger(rawIndex) || rawIndex < 0) {
        errors.push(`Geçersiz saat indeksi: ${rawIndex} (${entry.subject || '?'})`);
        continue;
      }
      const slotNumber = rawIndex + 1;
      if (!validSlotNumbers.has(slotNumber)) {
        errors.push(`Tanımsız ders saati numarası: ${slotNumber} (${entry.subject || '?'})`);
        continue;
      }
      const timeSlotId = timeSlotMap.get(slotNumber);

      if (!classId || !subjectId || !timeSlotId || !dayOfWeek) {
        errors.push(
          `Eşleştirilemedi: ${entry.subject || '?'} - ${entry.students || '?'} - ${entry.teacher || '?'} (Gün: ${entry.day}, Saat: ${slotNumber})`,
        );
        continue;
      }

      const classroomId = entry.room ? classroomMap.get(entry.room) : undefined;

      toCreate.push({
        classId,
        subjectId,
        timeSlotId,
        dayOfWeek,
        teacherId: teacherId || null,
        classroomId: classroomId || null,
      });
    }

    const totalInput = fetEntries.length;
    const errorRatio = errors.length / totalInput;

    if (errorRatio > 0.2) {
      throw new BadRequestException({
        message: `FET sonucunun %${Math.round(errorRatio * 100)}'i eşleştirilemedi. Veri tutarsız, içe aktarma iptal edildi.`,
        errorCount: errors.length,
        errors: errors.slice(0, 20),
      });
    }

    const affectedClassIds = Array.from(new Set(toCreate.map((e) => e.classId)));
    if (affectedClassIds.length === 0) {
      throw new BadRequestException('İçe aktarılacak geçerli kayıt bulunamadı');
    }

    const imported = await this.prisma.$transaction(async (tx) => {
      await tx.timetableEntry.deleteMany({ where: { classId: { in: affectedClassIds } } });
      const created = await tx.timetableEntry.createMany({ data: toCreate });
      return created.count;
    });

    return {
      importedCount: imported,
      errorCount: errors.length,
      errors: errors.slice(0, 20),
    };
  }

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
