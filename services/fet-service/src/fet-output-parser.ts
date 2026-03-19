/**
 * FET Output Parser
 * Parses FET-generated XML output files into usable timetable data
 *
 * FET output structure (in outputDir/timetables/FILENAME/):
 * - FILENAME_activities.xml - Activity Id + Day + Hour + Room
 * - FILENAME_soft_conflicts.txt - Soft constraint violations
 *
 * The activities XML only has Id/Day/Hour/Room - no teacher/subject/class info.
 * We need to match activity IDs back to the input data.
 */

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

/**
 * Parse FET output directory and extract timetable
 * @param outputDir FET output directory
 * @param inputActivities Original activity list (to map IDs back to teacher/subject/class)
 */
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

  // Find XML and TXT files recursively
  const xmlFiles = findAllFiles(outputDir, '.xml');
  const txtFiles = findAllFiles(outputDir, '.txt');

  // Find the activities XML file
  const activitiesFile = xmlFiles.find(f => f.includes('_activities.xml'));

  if (activitiesFile) {
    try {
      const content = fs.readFileSync(activitiesFile, 'utf-8');
      // Remove BOM if present
      const cleanContent = content.replace(/^\uFEFF/, '');
      const parsed = parser.parse(cleanContent);

      // FET output: Activities_Timetable > Activity[]
      let activities = parsed?.Activities_Timetable?.Activity;
      if (!activities) activities = [];
      if (!Array.isArray(activities)) activities = [activities];

      // Build input activity lookup by ID
      const inputMap = buildInputActivityMap(inputActivities);

      for (const act of activities) {
        const id = parseInt(act.Id || '0');
        const day = act.Day || '';
        const hour = act.Hour || '';
        const room = act.Room || null;

        if (!day || !hour) continue;

        // Get teacher/subject/class from input map
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

  // Parse soft conflicts
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

/**
 * Build a map of activity ID -> input activity data
 * FET assigns IDs sequentially starting from 1 based on the order in XML
 */
function buildInputActivityMap(inputActivities?: any[]): Map<number, any> {
  const map = new Map<number, any>();
  if (!inputActivities) return map;

  // Activities are numbered 1, 2, 3... in the order they appear in XML
  // Group activities by teacher+subject+class (same as generateActivitiesXml)
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

/**
 * Find all files with given extension recursively
 */
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
