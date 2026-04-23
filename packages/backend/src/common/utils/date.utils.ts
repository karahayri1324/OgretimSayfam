import { DayOfWeek } from '@prisma/client';

export const APP_TIMEZONE = process.env.APP_TIMEZONE || 'Europe/Istanbul';

const DAY_OF_WEEK_MAP: DayOfWeek[] = [
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
];

function getDatePartsInTimezone(date: Date, timezone: string): { year: string; month: string; day: string; weekday: string } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'long',
  }).formatToParts(date);
  return {
    year: parts.find((p) => p.type === 'year')!.value,
    month: parts.find((p) => p.type === 'month')!.value,
    day: parts.find((p) => p.type === 'day')!.value,
    weekday: parts.find((p) => p.type === 'weekday')!.value,
  };
}

export function getDayOfWeekInTimezone(date: Date = new Date(), timezone: string = APP_TIMEZONE): DayOfWeek {
  const { weekday } = getDatePartsInTimezone(date, timezone);
  const upper = weekday.toUpperCase();
  const match = DAY_OF_WEEK_MAP.find((d) => d === upper);
  if (!match) throw new Error(`Beklenmeyen gun adi: ${weekday}`);
  return match;
}

export function isWeekendInTimezone(date: Date = new Date(), timezone: string = APP_TIMEZONE): boolean {
  const day = getDayOfWeekInTimezone(date, timezone);
  return day === 'SATURDAY' || day === 'SUNDAY';
}

export function getStartOfDayInTimezone(date: Date = new Date(), timezone: string = APP_TIMEZONE): Date {
  const { year, month, day } = getDatePartsInTimezone(date, timezone);
  return new Date(`${year}-${month}-${day}T00:00:00.000Z`);
}

export function parseDateOnly(value: string, timezone: string = APP_TIMEZONE): Date {
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return new Date(`${trimmed}T00:00:00.000Z`);
  }
  const parsed = new Date(trimmed);
  if (isNaN(parsed.getTime())) {
    throw new Error(`Gecersiz tarih: ${value}`);
  }
  return getStartOfDayInTimezone(parsed, timezone);
}

export function isValidTimeOfDay(value: string): boolean {
  const match = /^([0-1]\d|2[0-3]):([0-5]\d)$/.exec(value);
  return match !== null;
}
