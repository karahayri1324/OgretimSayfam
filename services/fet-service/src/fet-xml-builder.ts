/**
 * FET XML Builder
 * Generates FET-compatible .fet XML input files from school data
 * FET XML format reference: https://www.lalescu.ro/liviu/fet/
 */

interface Teacher {
  id: string;
  name: string;
  unavailable?: { day: number; hour: number }[];
  maxHoursDaily?: number;
  maxGapsDaily?: number;
}

interface Subject {
  id: string;
  name: string;
}

interface ClassInfo {
  id: string;
  name: string;
  capacity?: number;
}

interface Room {
  id: string;
  name: string;
  capacity?: number;
}

interface Activity {
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

interface Constraints {
  // Teacher constraints
  teacherMaxHoursDaily?: { teacherName: string; maxHours: number }[];
  teacherMaxGapsDaily?: { teacherName: string; maxGaps: number }[];
  teacherNotAvailable?: { teacherName: string; day: string; hour: string }[];

  // Class/Students constraints
  classMaxHoursDaily?: { className: string; maxHours: number }[];
  classMaxGapsDaily?: { className: string; maxGaps: number }[];
  classNotAvailable?: { className: string; day: string; hour: string }[];

  // Activity constraints
  activityPreferredRoom?: { activityId: number; roomName: string }[];
  activityPreferredTime?: { activityId: number; day: string; hour: string }[];

  // General constraints
  maxDaysPerWeek?: number;
  minHoursDaily?: number;
  maxHoursDaily?: number;
}

interface FetInput {
  teachers: Teacher[];
  subjects: Subject[];
  classes: ClassInfo[];
  rooms: Room[];
  activities: Activity[];
  constraints?: Constraints;
  daysCount?: number;
  hoursCount?: number;
  dayNames?: string[];
  hourNames?: string[];
}

const DEFAULT_DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];
const DEFAULT_HOURS = ['1. Ders', '2. Ders', '3. Ders', '4. Ders', '5. Ders', '6. Ders', '7. Ders', '8. Ders'];

export function generateFetXml(input: FetInput): string {
  const days = input.dayNames || DEFAULT_DAYS;
  const hours = input.hourNames || DEFAULT_HOURS;
  const daysCount = input.daysCount || days.length;
  const hoursCount = input.hoursCount || hours.length;

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<fet version="6.8.5">

<Institution_Name>OgretimSayfam</Institution_Name>

<Comments>Otomatik oluşturuldu - OgretimSayfam</Comments>

<Days_List>
<Number_of_Days>${daysCount}</Number_of_Days>
${days.map(d => `<Day><Name>${escapeXml(d)}</Name></Day>`).join('\n')}
</Days_List>

<Hours_List>
<Number_of_Hours>${hoursCount}</Number_of_Hours>
${hours.map(h => `<Hour><Name>${escapeXml(h)}</Name></Hour>`).join('\n')}
</Hours_List>

<Teachers_List>
${(input.teachers || []).map(t => `<Teacher>
<Name>${escapeXml(t.name)}</Name>
<Target_Number_of_Hours>0</Target_Number_of_Hours>
<Qualified_Subjects></Qualified_Subjects>
<Comments></Comments>
</Teacher>`).join('\n')}
</Teachers_List>

<Subjects_List>
${(input.subjects || []).map(s => `<Subject>
<Name>${escapeXml(s.name)}</Name>
<Comments></Comments>
</Subject>`).join('\n')}
</Subjects_List>

<Activity_Tags_List>
</Activity_Tags_List>

<Students_List>
${(input.classes || []).map(c => `<Year>
<Name>${escapeXml(c.name)}</Name>
<Number_of_Students>${c.capacity || 30}</Number_of_Students>
<Comments></Comments>
</Year>`).join('\n')}
</Students_List>

<Activities_List>
${generateActivitiesXml(input.activities || [])}
</Activities_List>

<Buildings_List>
</Buildings_List>

<Rooms_List>
${(input.rooms || []).map(r => `<Room>
<Name>${escapeXml(r.name)}</Name>
<Building></Building>
<Capacity>${r.capacity || 30}</Capacity>
<Virtual>false</Virtual>
<Comments></Comments>
</Room>`).join('\n')}
</Rooms_List>

<Time_Constraints_List>
<ConstraintBasicCompulsoryTime>
<Weight_Percentage>100</Weight_Percentage>
<Active>true</Active>
<Comments></Comments>
</ConstraintBasicCompulsoryTime>
${generateTimeConstraints(input.constraints, days, hours)}
</Time_Constraints_List>

<Space_Constraints_List>
<ConstraintBasicCompulsorySpace>
<Weight_Percentage>100</Weight_Percentage>
<Active>true</Active>
<Comments></Comments>
</ConstraintBasicCompulsorySpace>
${generateSpaceConstraints(input.constraints, input.activities)}
</Space_Constraints_List>

</fet>`;

  return xml;
}

function generateActivitiesXml(activities: Activity[]): string {
  // Group activities by teacher+subject+class to handle split activities
  let activityId = 1;
  const xmlParts: string[] = [];

  // Group activities that have totalDuration > duration (split into multiple)
  const grouped = new Map<string, Activity[]>();
  for (const act of activities) {
    const key = `${act.teacherId}_${act.subjectId}_${act.classId}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(act);
  }

  for (const [, group] of grouped) {
    const act = group[0];
    const totalDuration = group.reduce((sum, a) => sum + a.duration, 0);

    // If multiple activities in group, they share a group ID for split
    if (group.length > 1) {
      const groupId = activityId;
      for (const a of group) {
        xmlParts.push(`<Activity>
<Id>${activityId}</Id>
<Teacher>${escapeXml(a.teacherName)}</Teacher>
<Subject>${escapeXml(a.subjectName)}</Subject>
<Students>${escapeXml(a.className)}</Students>
<Duration>${a.duration}</Duration>
<Total_Duration>${totalDuration}</Total_Duration>
<Activity_Group_Id>${groupId}</Activity_Group_Id>
<Active>true</Active>
<Comments></Comments>
</Activity>`);
        activityId++;
      }
    } else {
      xmlParts.push(`<Activity>
<Id>${activityId}</Id>
<Teacher>${escapeXml(act.teacherName)}</Teacher>
<Subject>${escapeXml(act.subjectName)}</Subject>
<Students>${escapeXml(act.className)}</Students>
<Duration>${act.duration}</Duration>
<Total_Duration>${totalDuration}</Total_Duration>
<Activity_Group_Id>0</Activity_Group_Id>
<Active>true</Active>
<Comments></Comments>
</Activity>`);
      activityId++;
    }
  }

  return xmlParts.join('\n');
}

function generateTimeConstraints(constraints: Constraints | undefined, days: string[], hours: string[]): string {
  if (!constraints) return '';

  const parts: string[] = [];

  // Teacher not available times
  if (constraints.teacherNotAvailable) {
    for (const c of constraints.teacherNotAvailable) {
      parts.push(`<ConstraintTeacherNotAvailableTimes>
<Weight_Percentage>100</Weight_Percentage>
<Teacher>${escapeXml(c.teacherName)}</Teacher>
<Number_of_Not_Available_Times>1</Number_of_Not_Available_Times>
<Not_Available_Time>
<Day>${escapeXml(c.day)}</Day>
<Hour>${escapeXml(c.hour)}</Hour>
</Not_Available_Time>
<Active>true</Active>
<Comments></Comments>
</ConstraintTeacherNotAvailableTimes>`);
    }
  }

  // Teacher max hours daily
  if (constraints.teacherMaxHoursDaily) {
    for (const c of constraints.teacherMaxHoursDaily) {
      parts.push(`<ConstraintTeacherMaxHoursDaily>
<Weight_Percentage>100</Weight_Percentage>
<Teacher_Name>${escapeXml(c.teacherName)}</Teacher_Name>
<Maximum_Hours_Daily>${c.maxHours}</Maximum_Hours_Daily>
<Active>true</Active>
<Comments></Comments>
</ConstraintTeacherMaxHoursDaily>`);
    }
  }

  // Teacher max gaps per day
  if (constraints.teacherMaxGapsDaily) {
    for (const c of constraints.teacherMaxGapsDaily) {
      parts.push(`<ConstraintTeacherMaxGapsPerDay>
<Weight_Percentage>100</Weight_Percentage>
<Teacher_Name>${escapeXml(c.teacherName)}</Teacher_Name>
<Max_Gaps>${c.maxGaps}</Max_Gaps>
<Active>true</Active>
<Comments></Comments>
</ConstraintTeacherMaxGapsPerDay>`);
    }
  }

  // Class/Students not available times
  if (constraints.classNotAvailable) {
    for (const c of constraints.classNotAvailable) {
      parts.push(`<ConstraintStudentsSetNotAvailableTimes>
<Weight_Percentage>100</Weight_Percentage>
<Students>${escapeXml(c.className)}</Students>
<Number_of_Not_Available_Times>1</Number_of_Not_Available_Times>
<Not_Available_Time>
<Day>${escapeXml(c.day)}</Day>
<Hour>${escapeXml(c.hour)}</Hour>
</Not_Available_Time>
<Active>true</Active>
<Comments></Comments>
</ConstraintStudentsSetNotAvailableTimes>`);
    }
  }

  // Class max hours daily
  if (constraints.classMaxHoursDaily) {
    for (const c of constraints.classMaxHoursDaily) {
      parts.push(`<ConstraintStudentsSetMaxHoursDaily>
<Weight_Percentage>100</Weight_Percentage>
<Students>${escapeXml(c.className)}</Students>
<Maximum_Hours_Daily>${c.maxHours}</Maximum_Hours_Daily>
<Active>true</Active>
<Comments></Comments>
</ConstraintStudentsSetMaxHoursDaily>`);
    }
  }

  // Class max gaps per day
  if (constraints.classMaxGapsDaily) {
    for (const c of constraints.classMaxGapsDaily) {
      parts.push(`<ConstraintStudentsSetMaxGapsPerDay>
<Weight_Percentage>100</Weight_Percentage>
<Students>${escapeXml(c.className)}</Students>
<Max_Gaps>${c.maxGaps}</Max_Gaps>
<Active>true</Active>
<Comments></Comments>
</ConstraintStudentsSetMaxGapsPerDay>`);
    }
  }

  // Activity preferred times
  if (constraints.activityPreferredTime) {
    for (const c of constraints.activityPreferredTime) {
      parts.push(`<ConstraintActivityPreferredStartingTime>
<Weight_Percentage>90</Weight_Percentage>
<Activity_Id>${c.activityId}</Activity_Id>
<Preferred_Day>${escapeXml(c.day)}</Preferred_Day>
<Preferred_Hour>${escapeXml(c.hour)}</Preferred_Hour>
<Permanently_Locked>false</Permanently_Locked>
<Active>true</Active>
<Comments></Comments>
</ConstraintActivityPreferredStartingTime>`);
    }
  }

  return parts.join('\n');
}

function generateSpaceConstraints(constraints: Constraints | undefined, activities?: Activity[]): string {
  const parts: string[] = [];

  // Activity preferred rooms from constraints
  if (constraints?.activityPreferredRoom) {
    for (const c of constraints.activityPreferredRoom) {
      parts.push(`<ConstraintActivityPreferredRoom>
<Weight_Percentage>100</Weight_Percentage>
<Activity_Id>${c.activityId}</Activity_Id>
<Room>${escapeXml(c.roomName)}</Room>
<Permanently_Locked>false</Permanently_Locked>
<Active>true</Active>
<Comments></Comments>
</ConstraintActivityPreferredRoom>`);
    }
  }

  // Also add preferred rooms from activities that have a room specified
  // Must use the same grouping logic as generateActivitiesXml to match activity IDs
  if (activities) {
    const grouped = new Map<string, Activity[]>();
    for (const act of activities) {
      const key = `${act.teacherId}_${act.subjectId}_${act.classId}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(act);
    }

    let actId = 1;
    for (const [, group] of grouped) {
      for (const a of group) {
        if (a.roomName) {
          parts.push(`<ConstraintActivityPreferredRoom>
<Weight_Percentage>90</Weight_Percentage>
<Activity_Id>${actId}</Activity_Id>
<Room>${escapeXml(a.roomName)}</Room>
<Permanently_Locked>false</Permanently_Locked>
<Active>true</Active>
<Comments></Comments>
</ConstraintActivityPreferredRoom>`);
        }
        actId++;
      }
    }
  }

  return parts.join('\n');
}

function escapeXml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
