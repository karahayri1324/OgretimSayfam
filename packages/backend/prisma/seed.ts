import { PrismaClient, UserRole, DayOfWeek, AnnouncementCategory, EventType, SubmissionStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const SALT_ROUNDS = 10;
const DEFAULT_PASSWORD = '123456';

async function main() {
  console.log('🌱 Seed başlatılıyor...');

  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS);

  // ==================== 1. OKUL ====================
  const school = await prisma.school.upsert({
    where: { slug: 'ataturk-anadolu' },
    update: {},
    create: {
      name: 'Atatürk Anadolu Lisesi',
      slug: 'ataturk-anadolu',
      address: 'Atatürk Bulvarı No: 123, Ankara',
      phone: '0312 123 45 67',
      email: 'info@ataturk-anadolu.com',
      isActive: true,
    },
  });
  console.log(`✅ Okul oluşturuldu: ${school.name}`);

  // ==================== 2. AKADEMİK YIL & DÖNEMLER ====================
  let academicYear = await prisma.academicYear.findFirst({
    where: { schoolId: school.id, name: '2025-2026' },
  });

  if (!academicYear) {
    academicYear = await prisma.academicYear.create({
      data: {
        schoolId: school.id,
        name: '2025-2026',
        startDate: new Date('2025-09-15'),
        endDate: new Date('2026-06-19'),
        isCurrent: true,
      },
    });
  }
  console.log(`✅ Akademik yıl oluşturuldu: ${academicYear.name}`);

  const term1 = await prisma.term.upsert({
    where: {
      id: (await prisma.term.findFirst({
        where: { academicYearId: academicYear.id, name: '1. Dönem' },
      }))?.id ?? 'non-existent-id',
    },
    update: {},
    create: {
      academicYearId: academicYear.id,
      name: '1. Dönem',
      startDate: new Date('2025-09-15'),
      endDate: new Date('2026-01-23'),
      isCurrent: true,
    },
  });

  const term2 = await prisma.term.upsert({
    where: {
      id: (await prisma.term.findFirst({
        where: { academicYearId: academicYear.id, name: '2. Dönem' },
      }))?.id ?? 'non-existent-id',
    },
    update: {},
    create: {
      academicYearId: academicYear.id,
      name: '2. Dönem',
      startDate: new Date('2026-02-09'),
      endDate: new Date('2026-06-19'),
      isCurrent: false,
    },
  });
  console.log(`✅ Dönemler oluşturuldu: ${term1.name}, ${term2.name}`);

  // ==================== 3. KULLANICILAR ====================

  // --- Super Admin ---
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@ogretimsayfam.com' },
    update: {},
    create: {
      email: 'admin@ogretimsayfam.com',
      password: hashedPassword,
      firstName: 'Sistem',
      lastName: 'Yöneticisi',
      role: UserRole.SUPER_ADMIN,
      isActive: true,
    },
  });
  console.log(`✅ Süper admin oluşturuldu: ${superAdmin.email}`);

  // --- Okul Müdürü ---
  const schoolAdmin = await prisma.user.upsert({
    where: { email: 'mudur@ataturk-anadolu.com' },
    update: {},
    create: {
      email: 'mudur@ataturk-anadolu.com',
      password: hashedPassword,
      firstName: 'Ahmet',
      lastName: 'Yılmaz',
      role: UserRole.SCHOOL_ADMIN,
      schoolId: school.id,
      isActive: true,
    },
  });
  console.log(`✅ Okul müdürü oluşturuldu: ${schoolAdmin.email}`);

  // --- Öğretmenler ---
  const teacherData = [
    { email: 'ogretmen1@ataturk-anadolu.com', firstName: 'Mehmet', lastName: 'Kaya', branch: 'Matematik', title: 'Matematik Öğretmeni' },
    { email: 'ogretmen2@ataturk-anadolu.com', firstName: 'Ayşe', lastName: 'Demir', branch: 'Fizik', title: 'Fizik Öğretmeni' },
    { email: 'ogretmen3@ataturk-anadolu.com', firstName: 'Fatma', lastName: 'Çelik', branch: 'Türk Dili ve Edebiyatı', title: 'Edebiyat Öğretmeni' },
    { email: 'ogretmen4@ataturk-anadolu.com', firstName: 'Hüseyin', lastName: 'Yıldız', branch: 'Kimya', title: 'Kimya Öğretmeni' },
    { email: 'ogretmen5@ataturk-anadolu.com', firstName: 'Zehra', lastName: 'Aksoy', branch: 'Biyoloji', title: 'Biyoloji Öğretmeni' },
    { email: 'ogretmen6@ataturk-anadolu.com', firstName: 'Mustafa', lastName: 'Özkan', branch: 'Tarih', title: 'Tarih Öğretmeni' },
    { email: 'ogretmen7@ataturk-anadolu.com', firstName: 'Seda', lastName: 'Korkmaz', branch: 'Coğrafya', title: 'Coğrafya Öğretmeni' },
    { email: 'ogretmen8@ataturk-anadolu.com', firstName: 'Emre', lastName: 'Tan', branch: 'İngilizce', title: 'İngilizce Öğretmeni' },
  ];

  const teachers: Array<{ user: any; profile: any }> = [];

  for (const td of teacherData) {
    const user = await prisma.user.upsert({
      where: { email: td.email },
      update: {},
      create: {
        email: td.email,
        password: hashedPassword,
        firstName: td.firstName,
        lastName: td.lastName,
        role: UserRole.TEACHER,
        schoolId: school.id,
        isActive: true,
      },
    });

    const profile = await prisma.teacherProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        branch: td.branch,
        title: td.title,
      },
    });

    teachers.push({ user, profile });
  }
  console.log(`✅ ${teachers.length} öğretmen oluşturuldu`);

  // --- Öğrenciler ---
  const studentData = [
    { email: 'ogrenci1@ataturk-anadolu.com', firstName: 'Ali', lastName: 'Öztürk', studentNumber: '1001' },
    { email: 'ogrenci2@ataturk-anadolu.com', firstName: 'Zeynep', lastName: 'Arslan', studentNumber: '1002' },
    { email: 'ogrenci3@ataturk-anadolu.com', firstName: 'Burak', lastName: 'Şahin', studentNumber: '1003' },
    { email: 'ogrenci4@ataturk-anadolu.com', firstName: 'Elif', lastName: 'Koç', studentNumber: '1004' },
    { email: 'ogrenci5@ataturk-anadolu.com', firstName: 'Can', lastName: 'Aydın', studentNumber: '1005' },
  ];

  const students: Array<{ user: any; profile: any }> = [];

  for (const sd of studentData) {
    const user = await prisma.user.upsert({
      where: { email: sd.email },
      update: {},
      create: {
        email: sd.email,
        password: hashedPassword,
        firstName: sd.firstName,
        lastName: sd.lastName,
        role: UserRole.STUDENT,
        schoolId: school.id,
        isActive: true,
      },
    });

    // Profile will be created after classes are set up (need classId)
    students.push({ user, profile: null });
  }
  console.log(`✅ ${students.length} öğrenci oluşturuldu`);

  // --- Veliler ---
  const parentData = [
    { email: 'veli1@ataturk-anadolu.com', firstName: 'Hasan', lastName: 'Öztürk' },
    { email: 'veli2@ataturk-anadolu.com', firstName: 'Hatice', lastName: 'Arslan' },
  ];

  const parents: Array<{ user: any; profile: any }> = [];

  for (const pd of parentData) {
    const user = await prisma.user.upsert({
      where: { email: pd.email },
      update: {},
      create: {
        email: pd.email,
        password: hashedPassword,
        firstName: pd.firstName,
        lastName: pd.lastName,
        role: UserRole.PARENT,
        schoolId: school.id,
        isActive: true,
      },
    });

    const profile = await prisma.parentProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
      },
    });

    parents.push({ user, profile });
  }
  console.log(`✅ ${parents.length} veli oluşturuldu`);

  // ==================== 4. SINIFLAR ====================
  const classData = [
    { name: '9-A', grade: 9, section: 'A' },
    { name: '9-B', grade: 9, section: 'B' },
    { name: '10-A', grade: 10, section: 'A' },
  ];

  const classes: Record<string, any> = {};

  for (const cd of classData) {
    const cls = await prisma.class.upsert({
      where: {
        schoolId_grade_section: {
          schoolId: school.id,
          grade: cd.grade,
          section: cd.section,
        },
      },
      update: {},
      create: {
        schoolId: school.id,
        name: cd.name,
        grade: cd.grade,
        section: cd.section,
        capacity: 30,
        isActive: true,
      },
    });
    classes[cd.name] = cls;
  }
  console.log(`✅ ${Object.keys(classes).length} sınıf oluşturuldu`);

  // --- Öğrenci profillerini oluştur ve 9-A'ya ata ---
  for (let i = 0; i < students.length; i++) {
    const sd = studentData[i];
    const profile = await prisma.studentProfile.upsert({
      where: { userId: students[i].user.id },
      update: {},
      create: {
        userId: students[i].user.id,
        studentNumber: sd.studentNumber,
        classId: classes['9-A'].id,
      },
    });
    students[i].profile = profile;
  }
  console.log('✅ Öğrenciler 9-A sınıfına atandı');

  // --- Veli-öğrenci ilişkileri ---
  // Veli 1 -> Öğrenci 1 (Ali Öztürk'ün babası)
  const ps1Existing = await prisma.parentStudent.findUnique({
    where: {
      parentId_studentId: {
        parentId: parents[0].profile.id,
        studentId: students[0].profile.id,
      },
    },
  });
  if (!ps1Existing) {
    await prisma.parentStudent.create({
      data: {
        parentId: parents[0].profile.id,
        studentId: students[0].profile.id,
        relation: 'Baba',
      },
    });
  }

  // Veli 2 -> Öğrenci 2 (Zeynep Arslan'ın annesi)
  const ps2Existing = await prisma.parentStudent.findUnique({
    where: {
      parentId_studentId: {
        parentId: parents[1].profile.id,
        studentId: students[1].profile.id,
      },
    },
  });
  if (!ps2Existing) {
    await prisma.parentStudent.create({
      data: {
        parentId: parents[1].profile.id,
        studentId: students[1].profile.id,
        relation: 'Anne',
      },
    });
  }
  console.log('✅ Veli-öğrenci ilişkileri oluşturuldu');

  // ==================== 5. DERSLER ====================
  const subjectData = [
    { name: 'Matematik', code: 'MAT', color: '#4CAF50' },
    { name: 'Fizik', code: 'FIZ', color: '#2196F3' },
    { name: 'Kimya', code: 'KIM', color: '#FF9800' },
    { name: 'Biyoloji', code: 'BIY', color: '#8BC34A' },
    { name: 'Türk Dili ve Edebiyatı', code: 'TDE', color: '#9C27B0' },
    { name: 'Tarih', code: 'TAR', color: '#795548' },
    { name: 'Coğrafya', code: 'COG', color: '#009688' },
    { name: 'İngilizce', code: 'ING', color: '#F44336' },
  ];

  const subjects: Record<string, any> = {};

  for (const sd of subjectData) {
    const subject = await prisma.subject.upsert({
      where: {
        schoolId_name: {
          schoolId: school.id,
          name: sd.name,
        },
      },
      update: {},
      create: {
        schoolId: school.id,
        name: sd.name,
        code: sd.code,
        color: sd.color,
        isActive: true,
      },
    });
    subjects[sd.name] = subject;
  }
  console.log(`✅ ${Object.keys(subjects).length} ders oluşturuldu`);

  // ==================== 6. DERSLİKLER ====================
  const classroomData = [
    { name: 'Derslik 101', capacity: 30, type: 'NORMAL' },
    { name: 'Derslik 102', capacity: 30, type: 'NORMAL' },
    { name: 'Derslik 103', capacity: 30, type: 'NORMAL' },
    { name: 'Derslik 104', capacity: 30, type: 'NORMAL' },
    { name: 'Derslik 105', capacity: 30, type: 'NORMAL' },
    { name: 'Fizik Lab', capacity: 24, type: 'LAB' },
    { name: 'Kimya Lab', capacity: 24, type: 'LAB' },
  ];

  const classrooms: Record<string, any> = {};

  for (const cr of classroomData) {
    const classroom = await prisma.classroom.upsert({
      where: {
        schoolId_name: {
          schoolId: school.id,
          name: cr.name,
        },
      },
      update: {},
      create: {
        schoolId: school.id,
        name: cr.name,
        capacity: cr.capacity,
        type: cr.type,
        isActive: true,
      },
    });
    classrooms[cr.name] = classroom;
  }
  console.log(`✅ ${Object.keys(classrooms).length} derslik oluşturuldu`);

  // ==================== 7. ÖĞRETMEN ATAMALARI ====================
  // Matematik öğretmeni -> 9-A Matematik, 9-B Matematik, 10-A Matematik
  const assignmentData = [
    { teacherIdx: 0, className: '9-A', subjectName: 'Matematik', hours: 6 },
    { teacherIdx: 0, className: '9-B', subjectName: 'Matematik', hours: 6 },
    { teacherIdx: 0, className: '10-A', subjectName: 'Matematik', hours: 5 },
    // Fizik öğretmeni -> 9-A Fizik, 9-B Fizik, 10-A Fizik
    { teacherIdx: 1, className: '9-A', subjectName: 'Fizik', hours: 4 },
    { teacherIdx: 1, className: '9-B', subjectName: 'Fizik', hours: 4 },
    { teacherIdx: 1, className: '10-A', subjectName: 'Fizik', hours: 4 },
    // Edebiyat öğretmeni -> 9-A TDE, 9-B TDE, 10-A TDE
    { teacherIdx: 2, className: '9-A', subjectName: 'Türk Dili ve Edebiyatı', hours: 5 },
    { teacherIdx: 2, className: '9-B', subjectName: 'Türk Dili ve Edebiyatı', hours: 5 },
    { teacherIdx: 2, className: '10-A', subjectName: 'Türk Dili ve Edebiyatı', hours: 5 },
    // Kimya öğretmeni -> tüm sınıflar
    { teacherIdx: 3, className: '9-A', subjectName: 'Kimya', hours: 3 },
    { teacherIdx: 3, className: '9-B', subjectName: 'Kimya', hours: 3 },
    { teacherIdx: 3, className: '10-A', subjectName: 'Kimya', hours: 3 },
    // Biyoloji öğretmeni -> tüm sınıflar
    { teacherIdx: 4, className: '9-A', subjectName: 'Biyoloji', hours: 3 },
    { teacherIdx: 4, className: '9-B', subjectName: 'Biyoloji', hours: 3 },
    { teacherIdx: 4, className: '10-A', subjectName: 'Biyoloji', hours: 3 },
    // Tarih öğretmeni -> tüm sınıflar
    { teacherIdx: 5, className: '9-A', subjectName: 'Tarih', hours: 2 },
    { teacherIdx: 5, className: '9-B', subjectName: 'Tarih', hours: 2 },
    { teacherIdx: 5, className: '10-A', subjectName: 'Tarih', hours: 2 },
    // Coğrafya öğretmeni -> tüm sınıflar
    { teacherIdx: 6, className: '9-A', subjectName: 'Coğrafya', hours: 2 },
    { teacherIdx: 6, className: '9-B', subjectName: 'Coğrafya', hours: 2 },
    { teacherIdx: 6, className: '10-A', subjectName: 'Coğrafya', hours: 2 },
    // İngilizce öğretmeni -> tüm sınıflar
    { teacherIdx: 7, className: '9-A', subjectName: 'İngilizce', hours: 4 },
    { teacherIdx: 7, className: '9-B', subjectName: 'İngilizce', hours: 4 },
    { teacherIdx: 7, className: '10-A', subjectName: 'İngilizce', hours: 4 },
  ];

  for (const ad of assignmentData) {
    const teacherProfileId = teachers[ad.teacherIdx].profile.id;
    const classId = classes[ad.className].id;
    const subjectId = subjects[ad.subjectName].id;

    const existing = await prisma.teacherAssignment.findUnique({
      where: {
        teacherProfileId_classId_subjectId: {
          teacherProfileId,
          classId,
          subjectId,
        },
      },
    });

    if (!existing) {
      await prisma.teacherAssignment.create({
        data: {
          teacherProfileId,
          classId,
          subjectId,
          hoursPerWeek: ad.hours,
        },
      });
    }
  }
  console.log(`✅ ${assignmentData.length} öğretmen ataması oluşturuldu`);

  // ==================== 8. DERS SAATLERİ (TIME SLOTS) ====================
  const timeSlotData = [
    { slotNumber: 1, startTime: '08:30', endTime: '09:10' },
    { slotNumber: 2, startTime: '09:20', endTime: '10:00' },
    { slotNumber: 3, startTime: '10:10', endTime: '10:50' },
    { slotNumber: 4, startTime: '11:00', endTime: '11:40' },
    { slotNumber: 5, startTime: '12:30', endTime: '13:10' },
    { slotNumber: 6, startTime: '13:20', endTime: '14:00' },
    { slotNumber: 7, startTime: '14:10', endTime: '14:50' },
    { slotNumber: 8, startTime: '15:00', endTime: '15:40' },
  ];

  const timeSlots: Record<number, any> = {};

  for (const ts of timeSlotData) {
    const timeSlot = await prisma.timeSlot.upsert({
      where: {
        schoolId_slotNumber: {
          schoolId: school.id,
          slotNumber: ts.slotNumber,
        },
      },
      update: {},
      create: {
        schoolId: school.id,
        slotNumber: ts.slotNumber,
        startTime: ts.startTime,
        endTime: ts.endTime,
      },
    });
    timeSlots[ts.slotNumber] = timeSlot;
  }
  console.log(`✅ ${Object.keys(timeSlots).length} ders saati oluşturuldu`);

  // ==================== 9. NOT KATEGORİLERİ ====================
  const gradeCategoryData = [
    { name: 'Yazılı Sınav', code: 'EXAM', weight: 3.0 },
    { name: 'Sözlü', code: 'ORAL', weight: 1.0 },
    { name: 'Ödev', code: 'HOMEWORK', weight: 1.0 },
    { name: 'Performans', code: 'PERFORMANCE', weight: 2.0 },
  ];

  for (const gc of gradeCategoryData) {
    await prisma.gradeCategory.upsert({
      where: {
        schoolId_code: {
          schoolId: school.id,
          code: gc.code,
        },
      },
      update: {},
      create: {
        schoolId: school.id,
        name: gc.name,
        code: gc.code,
        weight: gc.weight,
      },
    });
  }
  console.log(`✅ ${gradeCategoryData.length} not kategorisi oluşturuldu`);

  // ==================== 10. DERS PROGRAMI (9-A İÇİN ÖRNEK) ====================
  const timetableData = [
    // Pazartesi
    { day: DayOfWeek.MONDAY, slot: 1, subject: 'Matematik', teacher: 0, classroom: 'Derslik 101' },
    { day: DayOfWeek.MONDAY, slot: 2, subject: 'Matematik', teacher: 0, classroom: 'Derslik 101' },
    { day: DayOfWeek.MONDAY, slot: 3, subject: 'Fizik', teacher: 1, classroom: 'Fizik Lab' },
    { day: DayOfWeek.MONDAY, slot: 4, subject: 'Türk Dili ve Edebiyatı', teacher: 2, classroom: 'Derslik 101' },
    // Salı
    { day: DayOfWeek.TUESDAY, slot: 1, subject: 'Türk Dili ve Edebiyatı', teacher: 2, classroom: 'Derslik 101' },
    { day: DayOfWeek.TUESDAY, slot: 2, subject: 'Fizik', teacher: 1, classroom: 'Fizik Lab' },
    { day: DayOfWeek.TUESDAY, slot: 3, subject: 'Matematik', teacher: 0, classroom: 'Derslik 101' },
    // Çarşamba
    { day: DayOfWeek.WEDNESDAY, slot: 1, subject: 'Fizik', teacher: 1, classroom: 'Fizik Lab' },
    { day: DayOfWeek.WEDNESDAY, slot: 2, subject: 'Türk Dili ve Edebiyatı', teacher: 2, classroom: 'Derslik 101' },
    { day: DayOfWeek.WEDNESDAY, slot: 3, subject: 'Matematik', teacher: 0, classroom: 'Derslik 101' },
    // Perşembe
    { day: DayOfWeek.THURSDAY, slot: 1, subject: 'Matematik', teacher: 0, classroom: 'Derslik 101' },
    { day: DayOfWeek.THURSDAY, slot: 2, subject: 'Türk Dili ve Edebiyatı', teacher: 2, classroom: 'Derslik 101' },
    { day: DayOfWeek.THURSDAY, slot: 3, subject: 'Fizik', teacher: 1, classroom: 'Fizik Lab' },
    // Cuma
    { day: DayOfWeek.FRIDAY, slot: 1, subject: 'Matematik', teacher: 0, classroom: 'Derslik 101' },
    { day: DayOfWeek.FRIDAY, slot: 2, subject: 'Türk Dili ve Edebiyatı', teacher: 2, classroom: 'Derslik 101' },
    { day: DayOfWeek.FRIDAY, slot: 3, subject: 'Fizik', teacher: 1, classroom: 'Fizik Lab' },
  ];

  let timetableCount = 0;
  for (const tt of timetableData) {
    const classId = classes['9-A'].id;
    const timeSlotId = timeSlots[tt.slot].id;

    const existing = await prisma.timetableEntry.findUnique({
      where: {
        classId_dayOfWeek_timeSlotId: {
          classId,
          dayOfWeek: tt.day,
          timeSlotId,
        },
      },
    });

    if (!existing) {
      await prisma.timetableEntry.create({
        data: {
          classId,
          subjectId: subjects[tt.subject].id,
          timeSlotId,
          classroomId: classrooms[tt.classroom].id,
          dayOfWeek: tt.day,
          teacherId: teachers[tt.teacher].profile.id,
        },
      });
      timetableCount++;
    }
  }
  console.log(`✅ ${timetableCount} ders programı girişi oluşturuldu (9-A)`);

  // ==================== 10b. DERS PROGRAMI EK DERSLER (9-A İÇİN) ====================
  const timetableDataExtra = [
    // Pazartesi ek dersler
    { day: DayOfWeek.MONDAY, slot: 5, subject: 'Kimya', teacher: 3, classroom: 'Kimya Lab' },
    { day: DayOfWeek.MONDAY, slot: 6, subject: 'İngilizce', teacher: 7, classroom: 'Derslik 101' },
    // Salı ek dersler
    { day: DayOfWeek.TUESDAY, slot: 4, subject: 'Biyoloji', teacher: 4, classroom: 'Derslik 101' },
    { day: DayOfWeek.TUESDAY, slot: 5, subject: 'Tarih', teacher: 5, classroom: 'Derslik 101' },
    { day: DayOfWeek.TUESDAY, slot: 6, subject: 'İngilizce', teacher: 7, classroom: 'Derslik 101' },
    // Çarşamba ek dersler
    { day: DayOfWeek.WEDNESDAY, slot: 4, subject: 'Coğrafya', teacher: 6, classroom: 'Derslik 101' },
    { day: DayOfWeek.WEDNESDAY, slot: 5, subject: 'Kimya', teacher: 3, classroom: 'Kimya Lab' },
    // Perşembe ek dersler
    { day: DayOfWeek.THURSDAY, slot: 4, subject: 'Biyoloji', teacher: 4, classroom: 'Derslik 101' },
    { day: DayOfWeek.THURSDAY, slot: 5, subject: 'İngilizce', teacher: 7, classroom: 'Derslik 101' },
    { day: DayOfWeek.THURSDAY, slot: 6, subject: 'Tarih', teacher: 5, classroom: 'Derslik 101' },
    // Cuma ek dersler
    { day: DayOfWeek.FRIDAY, slot: 4, subject: 'Coğrafya', teacher: 6, classroom: 'Derslik 101' },
    { day: DayOfWeek.FRIDAY, slot: 5, subject: 'Kimya', teacher: 3, classroom: 'Kimya Lab' },
    { day: DayOfWeek.FRIDAY, slot: 6, subject: 'İngilizce', teacher: 7, classroom: 'Derslik 101' },
  ];

  let timetableExtraCount = 0;
  for (const tt of timetableDataExtra) {
    const classId = classes['9-A'].id;
    const timeSlotId = timeSlots[tt.slot].id;

    const existing = await prisma.timetableEntry.findUnique({
      where: {
        classId_dayOfWeek_timeSlotId: {
          classId,
          dayOfWeek: tt.day,
          timeSlotId,
        },
      },
    });

    if (!existing) {
      await prisma.timetableEntry.create({
        data: {
          classId,
          subjectId: subjects[tt.subject].id,
          timeSlotId,
          classroomId: classrooms[tt.classroom].id,
          dayOfWeek: tt.day,
          teacherId: teachers[tt.teacher].profile.id,
        },
      });
      timetableExtraCount++;
    }
  }
  console.log(`✅ ${timetableExtraCount} ek ders programı girişi oluşturuldu (9-A)`);

  // ==================== 11. DUYURULAR ====================
  const announcementData = [
    {
      title: '2025-2026 Eğitim Öğretim Yılına Hoş Geldiniz',
      content: 'Değerli öğrencilerimiz ve velilerimiz, 2025-2026 eğitim öğretim yılına hoş geldiniz. Yeni dönemde başarılar dileriz. Okulumuzda ders başlangıcı 15 Eylül 2025 Pazartesi günüdür. Kayıt işlemlerini tamamlamayan öğrencilerin en geç 12 Eylül tarihine kadar idareye başvurmaları gerekmektedir.',
      category: AnnouncementCategory.GENERAL,
      isPinned: true,
      createdAt: new Date('2025-09-10'),
    },
    {
      title: '1. Dönem Ara Tatil Duyurusu',
      content: 'Okulumuzda 1. dönem ara tatili 17-21 Kasım 2025 tarihleri arasında uygulanacaktır. Öğrencilerimize iyi tatiller dileriz. Tatil sonrası dersler 24 Kasım Pazartesi günü başlayacaktır.',
      category: AnnouncementCategory.GENERAL,
      isPinned: false,
      createdAt: new Date('2025-11-10'),
    },
    {
      title: '29 Ekim Cumhuriyet Bayramı Kutlama Programı',
      content: '29 Ekim Cumhuriyet Bayramı kutlamaları kapsamında okulumuzda tören düzenlenecektir. Tüm öğrencilerimizin okul kıyafetleriyle saat 09:00\'da bahçede hazır bulunmaları gerekmektedir. Tören sonrası sınıflarda etkinlikler yapılacaktır.',
      category: AnnouncementCategory.EVENT,
      isPinned: false,
      createdAt: new Date('2025-10-25'),
    },
    {
      title: '1. Yazılı Sınav Takvimi Açıklandı',
      content: 'Birinci dönem birinci yazılı sınavları 20-31 Ekim 2025 tarihleri arasında yapılacaktır. Sınav programı okul panosunda ve web sitemizde yayınlanmıştır. Öğrencilerimizin sınav takvimini takip etmeleri önemle rica olunur.',
      category: AnnouncementCategory.EXAM,
      isPinned: true,
      createdAt: new Date('2025-10-10'),
    },
    {
      title: 'Veli Toplantısı Hakkında',
      content: '1. dönem veli toplantısı 15 Kasım 2025 Cumartesi günü saat 10:00\'da okulumuzda gerçekleştirilecektir. Tüm velilerimizin katılımı beklenmektedir. Toplantıda öğrenci gelişim raporları paylaşılacak ve sınıf öğretmenleriyle birebir görüşme imkanı sunulacaktır.',
      category: AnnouncementCategory.GENERAL,
      isPinned: false,
      createdAt: new Date('2025-11-05'),
    },
    {
      title: 'Acil: Kar Tatili Duyurusu',
      content: 'Ankara Valiliğinin kararı doğrultusunda 10 Aralık 2025 Çarşamba günü okulumuzda eğitime bir gün ara verilecektir. Öğrencilerimizin olumsuz hava koşullarına karşı dikkatli olmaları rica olunur.',
      category: AnnouncementCategory.URGENT,
      isPinned: false,
      createdAt: new Date('2025-12-09'),
    },
  ];

  for (const ad of announcementData) {
    const existing = await prisma.announcement.findFirst({
      where: {
        schoolId: school.id,
        title: ad.title,
      },
    });

    if (!existing) {
      const announcement = await prisma.announcement.create({
        data: {
          schoolId: school.id,
          authorId: schoolAdmin.id,
          title: ad.title,
          content: ad.content,
          category: ad.category,
          isPinned: ad.isPinned,
          isActive: true,
          createdAt: ad.createdAt,
        },
      });

      // Tüm sınıfları hedef olarak ekle
      for (const className of Object.keys(classes)) {
        await prisma.announcementClass.create({
          data: {
            announcementId: announcement.id,
            classId: classes[className].id,
          },
        });
      }
    }
  }
  console.log(`✅ ${announcementData.length} duyuru oluşturuldu`);

  // ==================== 12. ETKİNLİKLER ====================
  const eventData = [
    {
      title: '29 Ekim Cumhuriyet Bayramı Töreni',
      description: 'Okulumuzda Cumhuriyet Bayramı kutlama töreni düzenlenecektir. Öğrencilerimiz şiir, tiyatro ve halk oyunları gösterileri sunacaklardır.',
      type: EventType.CEREMONY,
      startDate: new Date('2025-10-29T09:00:00'),
      endDate: new Date('2025-10-29T12:00:00'),
      location: 'Okul Bahçesi',
    },
    {
      title: '10 Kasım Atatürk\'ü Anma Töreni',
      description: 'Ulu Önder Mustafa Kemal Atatürk\'ü saygı ve minnetle anıyoruz. Saat 09:05\'te saygı duruşu yapılacak, ardından anma programı gerçekleştirilecektir.',
      type: EventType.CEREMONY,
      startDate: new Date('2025-11-10T09:00:00'),
      endDate: new Date('2025-11-10T11:00:00'),
      location: 'Okul Bahçesi',
    },
    {
      title: 'Bilim Fuarı',
      description: 'Okulumuzun geleneksel Bilim Fuarı bu yıl da düzenleniyor. Öğrencilerimiz hazırladıkları projeleri sergileyeceklerdir. Tüm velilerimiz davetlidir.',
      type: EventType.CULTURAL,
      startDate: new Date('2025-12-15T10:00:00'),
      endDate: new Date('2025-12-15T16:00:00'),
      location: 'Spor Salonu',
    },
    {
      title: 'Okullar Arası Futbol Turnuvası',
      description: 'İlçemiz okulları arasında düzenlenen futbol turnuvasına okulumuz da katılacaktır. Öğrencilerimize başarılar dileriz.',
      type: EventType.SPORTS,
      startDate: new Date('2025-11-22T13:00:00'),
      endDate: new Date('2025-11-22T17:00:00'),
      location: 'İlçe Stadyumu',
    },
    {
      title: 'Ankara Kalesi Tarih Gezisi',
      description: '9. sınıf öğrencilerimiz için Ankara Kalesi ve çevresindeki tarihi mekanları kapsayan bir gezi düzenlenecektir. Katılım ücretsizdir.',
      type: EventType.TRIP,
      startDate: new Date('2025-12-05T08:30:00'),
      endDate: new Date('2025-12-05T16:00:00'),
      location: 'Ankara Kalesi',
    },
    {
      title: '1. Dönem Veli Toplantısı',
      description: '1. dönem veli toplantısı gerçekleştirilecektir. Sınıf öğretmenleriyle birebir görüşme imkanı sunulacaktır.',
      type: EventType.MEETING,
      startDate: new Date('2025-11-15T10:00:00'),
      endDate: new Date('2025-11-15T13:00:00'),
      location: 'Konferans Salonu',
    },
  ];

  for (const ed of eventData) {
    const existing = await prisma.event.findFirst({
      where: {
        schoolId: school.id,
        title: ed.title,
      },
    });

    if (!existing) {
      await prisma.event.create({
        data: {
          schoolId: school.id,
          createdById: schoolAdmin.id,
          title: ed.title,
          description: ed.description,
          type: ed.type,
          startDate: ed.startDate,
          endDate: ed.endDate,
          location: ed.location,
          isActive: true,
        },
      });
    }
  }
  console.log(`✅ ${eventData.length} etkinlik oluşturuldu`);

  // ==================== 13. NOTLAR (GRADES) ====================
  // Not kategorilerini yeniden oku (id'lere ihtiyacımız var)
  const gradeCategories: Record<string, any> = {};
  for (const gc of gradeCategoryData) {
    const cat = await prisma.gradeCategory.findUnique({
      where: {
        schoolId_code: {
          schoolId: school.id,
          code: gc.code,
        },
      },
    });
    if (cat) gradeCategories[gc.code] = cat;
  }

  // 9-A sınıfındaki her öğrenci için Matematik, Fizik ve TDE notları
  const gradeEntries = [
    // Matematik notları
    { subjectName: 'Matematik', teacherIdx: 0, categoryCode: 'EXAM', description: '1. Yazılı Sınav', date: new Date('2025-10-25'), scores: [78, 92, 65, 88, 71] },
    { subjectName: 'Matematik', teacherIdx: 0, categoryCode: 'EXAM', description: '2. Yazılı Sınav', date: new Date('2025-12-15'), scores: [82, 88, 70, 91, 75] },
    { subjectName: 'Matematik', teacherIdx: 0, categoryCode: 'ORAL', description: 'Sözlü Notu', date: new Date('2025-11-10'), scores: [85, 90, 60, 95, 70] },
    { subjectName: 'Matematik', teacherIdx: 0, categoryCode: 'HOMEWORK', description: 'Ödev Notu', date: new Date('2025-11-20'), scores: [90, 95, 80, 85, 65] },
    // Fizik notları
    { subjectName: 'Fizik', teacherIdx: 1, categoryCode: 'EXAM', description: '1. Yazılı Sınav', date: new Date('2025-10-27'), scores: [70, 85, 55, 80, 68] },
    { subjectName: 'Fizik', teacherIdx: 1, categoryCode: 'EXAM', description: '2. Yazılı Sınav', date: new Date('2025-12-17'), scores: [75, 90, 60, 85, 72] },
    { subjectName: 'Fizik', teacherIdx: 1, categoryCode: 'ORAL', description: 'Sözlü Notu', date: new Date('2025-11-12'), scores: [80, 88, 65, 90, 75] },
    { subjectName: 'Fizik', teacherIdx: 1, categoryCode: 'PERFORMANCE', description: 'Performans Görevi', date: new Date('2025-12-01'), scores: [85, 92, 70, 88, 78] },
    // Türk Dili ve Edebiyatı notları
    { subjectName: 'Türk Dili ve Edebiyatı', teacherIdx: 2, categoryCode: 'EXAM', description: '1. Yazılı Sınav', date: new Date('2025-10-23'), scores: [82, 75, 90, 68, 85] },
    { subjectName: 'Türk Dili ve Edebiyatı', teacherIdx: 2, categoryCode: 'EXAM', description: '2. Yazılı Sınav', date: new Date('2025-12-13'), scores: [88, 80, 92, 72, 87] },
    { subjectName: 'Türk Dili ve Edebiyatı', teacherIdx: 2, categoryCode: 'ORAL', description: 'Sözlü Notu', date: new Date('2025-11-08'), scores: [90, 78, 95, 70, 88] },
    // Kimya notları
    { subjectName: 'Kimya', teacherIdx: 3, categoryCode: 'EXAM', description: '1. Yazılı Sınav', date: new Date('2025-10-28'), scores: [72, 80, 58, 85, 66] },
    { subjectName: 'Kimya', teacherIdx: 3, categoryCode: 'ORAL', description: 'Sözlü Notu', date: new Date('2025-11-15'), scores: [78, 85, 65, 90, 72] },
    // İngilizce notları
    { subjectName: 'İngilizce', teacherIdx: 7, categoryCode: 'EXAM', description: '1. Yazılı Sınav', date: new Date('2025-10-30'), scores: [88, 92, 75, 95, 80] },
    { subjectName: 'İngilizce', teacherIdx: 7, categoryCode: 'ORAL', description: 'Sözlü Notu', date: new Date('2025-11-18'), scores: [90, 95, 80, 92, 85] },
  ];

  let gradeCount = 0;
  for (const ge of gradeEntries) {
    const subjectId = subjects[ge.subjectName].id;
    const teacherProfileId = teachers[ge.teacherIdx].profile.id;
    const categoryId = gradeCategories[ge.categoryCode].id;

    for (let i = 0; i < students.length; i++) {
      const studentProfileId = students[i].profile.id;

      const existing = await prisma.grade.findFirst({
        where: {
          studentProfileId,
          subjectId,
          termId: term1.id,
          categoryId,
          description: ge.description,
        },
      });

      if (!existing) {
        await prisma.grade.create({
          data: {
            studentProfileId,
            subjectId,
            teacherProfileId,
            termId: term1.id,
            categoryId,
            score: ge.scores[i],
            description: ge.description,
            date: ge.date,
          },
        });
        gradeCount++;
      }
    }
  }
  console.log(`✅ ${gradeCount} not girişi oluşturuldu`);

  // ==================== 14. ÖDEVLER (ASSIGNMENTS) ====================
  const assignmentEntries = [
    {
      className: '9-A',
      subjectName: 'Matematik',
      title: 'Denklemler ve Eşitsizlikler Çalışma Kağıdı',
      description: 'Ders kitabı sayfa 45-50 arasındaki tüm soruları çözünüz. Çözümlerinizi ayrı bir kağıda yazarak teslim ediniz.',
      dueDate: new Date('2025-11-01'),
      createdAt: new Date('2025-10-20'),
    },
    {
      className: '9-A',
      subjectName: 'Matematik',
      title: 'Fonksiyonlar Proje Ödevi',
      description: 'Günlük hayattan bir fonksiyon örneği bulunuz ve grafiğini çiziniz. Fonksiyonun tanım kümesi, değer kümesi ve özelliklerini açıklayınız.',
      dueDate: new Date('2025-12-20'),
      createdAt: new Date('2025-12-01'),
    },
    {
      className: '9-A',
      subjectName: 'Fizik',
      title: 'Kuvvet ve Hareket Deney Raporu',
      description: 'Laboratuvarda yaptığımız kuvvet ve hareket deneyinin raporunu hazırlayınız. Raporda hipotez, yöntem, bulgular ve sonuç bölümleri bulunmalıdır.',
      dueDate: new Date('2025-11-15'),
      createdAt: new Date('2025-11-01'),
    },
    {
      className: '9-A',
      subjectName: 'Türk Dili ve Edebiyatı',
      title: 'Kitap Özeti: İnce Memed',
      description: 'Yaşar Kemal\'in İnce Memed romanını okuyarak en az 2 sayfalık bir özet yazınız. Özette ana karakterleri, olay örgüsünü ve temel temayı ele alınız.',
      dueDate: new Date('2025-11-30'),
      createdAt: new Date('2025-10-25'),
    },
    {
      className: '9-A',
      subjectName: 'Kimya',
      title: 'Periyodik Tablo Araştırma Ödevi',
      description: 'Periyodik tablodaki ilk 20 elementi araştırınız. Her element için sembol, atom numarası, kütle numarası ve günlük hayattaki kullanım alanlarını belirtiniz.',
      dueDate: new Date('2025-11-25'),
      createdAt: new Date('2025-11-05'),
    },
    {
      className: '9-A',
      subjectName: 'İngilizce',
      title: 'My Hometown - Essay Writing',
      description: 'Write an essay about your hometown in English (at least 200 words). Describe its history, famous places, and what makes it special. Use at least 5 new vocabulary words from Unit 3.',
      dueDate: new Date('2025-12-10'),
      createdAt: new Date('2025-11-20'),
    },
    {
      className: '9-A',
      subjectName: 'Tarih',
      title: 'Anadolu Uygarlıkları Sunumu',
      description: 'Anadolu\'da kurulan eski uygarlıklardan birini seçerek sınıfta 10 dakikalık bir sunum hazırlayınız. Sunumda uygarlığın coğrafi konumu, ekonomisi ve kültürel özellikleri yer almalıdır.',
      dueDate: new Date('2025-12-05'),
      createdAt: new Date('2025-11-10'),
    },
  ];

  let assignmentCount = 0;
  for (const ae of assignmentEntries) {
    const existing = await prisma.assignment.findFirst({
      where: {
        classId: classes[ae.className].id,
        subjectId: subjects[ae.subjectName].id,
        title: ae.title,
      },
    });

    if (!existing) {
      const assignment = await prisma.assignment.create({
        data: {
          classId: classes[ae.className].id,
          subjectId: subjects[ae.subjectName].id,
          termId: term1.id,
          title: ae.title,
          description: ae.description,
          dueDate: ae.dueDate,
          createdAt: ae.createdAt,
        },
      });

      // Bazı öğrenciler için teslim kayıtları oluştur
      for (let i = 0; i < students.length; i++) {
        const isPastDue = ae.dueDate < new Date();
        // İlk 3 öğrenci teslim etmiş, 4. geç teslim, 5. henüz teslim etmemiş
        let status: SubmissionStatus;
        let submittedAt: Date | null = null;
        let score: number | null = null;

        if (i < 3 && isPastDue) {
          status = SubmissionStatus.GRADED;
          submittedAt = new Date(ae.dueDate.getTime() - 2 * 24 * 60 * 60 * 1000); // 2 gün önce
          score = [85, 92, 70][i];
        } else if (i === 3 && isPastDue) {
          status = SubmissionStatus.LATE;
          submittedAt = new Date(ae.dueDate.getTime() + 1 * 24 * 60 * 60 * 1000); // 1 gün sonra
          score = null;
        } else {
          status = SubmissionStatus.PENDING;
        }

        await prisma.assignmentSubmission.create({
          data: {
            assignmentId: assignment.id,
            studentProfileId: students[i].profile.id,
            status,
            submittedAt,
            score,
            content: submittedAt ? 'Ödevim ektedir.' : null,
            feedback: status === SubmissionStatus.GRADED ? 'Güzel çalışma, devam et.' : null,
            gradedAt: status === SubmissionStatus.GRADED ? new Date(ae.dueDate.getTime() + 3 * 24 * 60 * 60 * 1000) : null,
          },
        });
      }

      assignmentCount++;
    }
  }
  console.log(`✅ ${assignmentCount} ödev oluşturuldu`);

  console.log('\n🎉 Seed tamamlandı!');
  console.log('========================================');
  console.log('Giriş bilgileri (tüm şifreler: 123456):');
  console.log('----------------------------------------');
  console.log('Süper Admin : admin@ogretimsayfam.com');
  console.log('Okul Müdürü : mudur@ataturk-anadolu.com');
  console.log('Öğretmen 1  : ogretmen1@ataturk-anadolu.com (Matematik)');
  console.log('Öğretmen 2  : ogretmen2@ataturk-anadolu.com (Fizik)');
  console.log('Öğretmen 3  : ogretmen3@ataturk-anadolu.com (Türk Dili ve Edebiyatı)');
  console.log('Öğretmen 4  : ogretmen4@ataturk-anadolu.com (Kimya)');
  console.log('Öğretmen 5  : ogretmen5@ataturk-anadolu.com (Biyoloji)');
  console.log('Öğretmen 6  : ogretmen6@ataturk-anadolu.com (Tarih)');
  console.log('Öğretmen 7  : ogretmen7@ataturk-anadolu.com (Coğrafya)');
  console.log('Öğretmen 8  : ogretmen8@ataturk-anadolu.com (İngilizce)');
  console.log('Öğrenci 1   : ogrenci1@ataturk-anadolu.com');
  console.log('Öğrenci 2   : ogrenci2@ataturk-anadolu.com');
  console.log('Öğrenci 3   : ogrenci3@ataturk-anadolu.com');
  console.log('Öğrenci 4   : ogrenci4@ataturk-anadolu.com');
  console.log('Öğrenci 5   : ogrenci5@ataturk-anadolu.com');
  console.log('Veli 1      : veli1@ataturk-anadolu.com');
  console.log('Veli 2      : veli2@ataturk-anadolu.com');
  console.log('========================================');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seed hatası:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
