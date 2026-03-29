
import fs from 'fs';
import path from 'path';
import { XMLParser } from 'fast-xml-parser';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  trimValues: true,
});

export interface TimetableEntry {
  activityId: number;
  day: string;
  hour: string;
  dayIndex: number;
  hourIndex: number;
  teacher: string;
  subject: string;
  students: string;
  room: string | null;
  duration: number;
}

export interface ParsedTimetable {
  entries: TimetableEntry[];
  softConflicts: string[];
  generationInfo: {
    successful: boolean;
    totalActivities: number;
    placedActivities: number;
  };
}

const DAY_INDEX_MAP: Record<string, number> = {
  'Pazartesi': 0, 'Salı': 1, 'Çarşamba': 2, 'Perşembe': 3, 'Cuma': 4,
  'Monday': 0, 'Tuesday': 1, 'Wednesday': 2, 'Thursday': 3, 'Friday': 4,
};

export function parseFetOutput(outputDir: string, inputActivities?: any[]): ParsedTimetable {
  const result: ParsedTimetable = {
    entries: [],
    softConflicts: [],
    generationInfo: {
      successful: false,
      totalActivities: 0,
      placedActivities: 0,
    },
  };

  const xmlFiles = findAllFiles(outputDir, '.xml');
  const txtFiles = findAllFiles(outputDir, '.txt');

  const activitiesFile = xmlFiles.find(f => f.includes('_activities.xml'));

  if (activitiesFile) {
    try {
      const content = fs.readFileSync(activitiesFile, 'utf-8');
      
      const cleanContent = content.replace(/^\uFEFF/, '');
      const parsed = parser.parse(cleanContent);

      let activities = parsed?.Activities_Timetable?.Activity;
      if (!activities) activities = [];
      if (!Array.isArray(activities)) activities = [activities];

      const inputMap = buildInputActivityMap(inputActivities);

      for (const act of activities) {
        const id = parseInt(act.Id || '0');
        const day = act.Day || '';
        const hour = act.Hour || '';
        const room = act.Room || null;

        if (!day || !hour) continue;

        const inputAct = inputMap.get(id);

        const hourStr = String(hour);
        let hourIndex = parseInt(hourStr.replace(/\D/g, '')) - 1;
        if (isNaN(hourIndex) || hourIndex < 0) hourIndex = 0;

        result.entries.push({
          activityId: id,
          day,
          hour: hourStr,
          dayIndex: DAY_INDEX_MAP[day] ?? 0,
          hourIndex,
          teacher: inputAct?.teacherName || '',
          subject: inputAct?.subjectName || '',
          students: inputAct?.className || '',
          room: room || null,
          duration: inputAct?.duration || 1,
        });
      }

      result.generationInfo.successful = true;
      result.generationInfo.placedActivities = result.entries.length;
      result.generationInfo.totalActivities = inputActivities?.length || result.entries.length;
    } catch (err: any) {
      console.error('[FET Parser] Error parsing activities:', err.message);
    }
  }

  const conflictsFile = txtFiles.find(f => f.includes('soft_conflicts'));
  if (conflictsFile) {
    try {
      const content = fs.readFileSync(conflictsFile, 'utf-8');
      result.softConflicts = content
        .split('\n')
        .filter(line => line.trim().length > 0)
        .slice(0, 50);
    } catch {}
  }

  return result;
}

function buildInputActivityMap(inputActivities?: any[]): Map<number, any> {
  const map = new Map<number, any>();
  if (!inputActivities) return map;

  const grouped = new Map<string, any[]>();
  for (const act of inputActivities) {
    const key = `${act.teacherId}_${act.subjectId}_${act.classId}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(act);
  }

  let id = 1;
  for (const [, group] of grouped) {
    for (const act of group) {
      map.set(id, act);
      id++;
    }
  }

  return map;
}

function findAllFiles(dir: string, ext: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findAllFiles(fullPath, ext));
    } else if (entry.name.endsWith(ext)) {
      results.push(fullPath);
    }
  }

  return results;
}
