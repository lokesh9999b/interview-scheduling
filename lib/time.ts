// All timestamps are stored in UTC. Everything the user sees is IST (UTC+5:30),
// which has no DST, so a fixed offset is exact and avoids a tz database dependency.

export const IST_OFFSET_MIN = 330;
export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const dateKeyFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const timeFmt = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

const dayFmt = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  weekday: "short",
  day: "numeric",
  month: "short",
});

const longDayFmt = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** YYYY-MM-DD in IST */
export function istDateKey(date: Date = new Date()): string {
  return dateKeyFmt.format(date);
}

export function istParts(date: Date) {
  const key = istDateKey(date);
  const [y, m, d] = key.split("-").map(Number);
  return { y, m, d, weekday: new Date(Date.UTC(y, m - 1, d)).getUTCDay(), dateKey: key };
}

/** Build a UTC instant from an IST calendar date + minutes from midnight. */
export function istToUtc(dateKey: string, minutes: number): Date {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0) + minutes * 60_000 - IST_OFFSET_MIN * 60_000);
}

/** Minutes from midnight IST for a UTC instant. */
export function utcToIstMinutes(date: Date): number {
  const shifted = new Date(date.getTime() + IST_OFFSET_MIN * 60_000);
  return shifted.getUTCHours() * 60 + shifted.getUTCMinutes();
}

export function addDaysKey(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

export function formatIstTime(date: Date): string {
  return timeFmt.format(date).toUpperCase().replace(/\s/g, " ");
}

export function formatIstTimeRange(start: Date, end: Date): string {
  return `${formatIstTime(start)} – ${formatIstTime(end)}`;
}

export function formatIstDay(date: Date): string {
  return dayFmt.format(date);
}

export function formatIstDayLong(date: Date): string {
  return longDayFmt.format(date);
}

export function minutesToLabel(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(hour12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function weekdayLabel(weekday: number): string {
  return WEEKDAYS[weekday];
}

export function relativeDayLabel(date: Date): string {
  const today = istDateKey();
  const key = istDateKey(date);
  if (key === today) return "Today";
  if (key === addDaysKey(today, 1)) return "Tomorrow";
  if (key === addDaysKey(today, -1)) return "Yesterday";
  return formatIstDay(date);
}

export function daysBetween(from: Date, to: Date): number {
  return Math.ceil((to.getTime() - from.getTime()) / 86_400_000);
}

export function nowPlusMinutes(min: number): Date {
  return new Date(Date.now() + min * 60_000);
}

export function roundToStep(date: Date, stepMinutes: number): Date {
  const ms = stepMinutes * 60_000;
  return new Date(Math.round(date.getTime() / ms) * ms);
}

export function isoDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}
