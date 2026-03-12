/**
 * Pick a random time within a slot's hour range for natural-looking scheduling.
 */
export function pickTimeInSlot(date: Date, startHour: number, endHour: number): Date {
  const result = new Date(date);
  const totalMinutes = (endHour - startHour) * 60;
  const randomMinute = Math.floor(Math.random() * totalMinutes);
  const hour = startHour + Math.floor(randomMinute / 60);
  const minute = randomMinute % 60;
  result.setHours(hour, minute, 0, 0);
  return result;
}

/**
 * Get the Monday of the week containing the given date.
 * Week starts on Monday.
 */
export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  // Convert Sunday=0 to 6, Monday=1 to 0, etc.
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get the date for a specific day of week offset from a week start.
 * dayOfWeek: 0=Mon, 1=Tue, ... 6=Sun
 */
export function getDateForDay(weekStart: Date, dayOfWeek: number): Date {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + dayOfWeek);
  return d;
}

export const TIME_BLOCKS = [
  { id: "morning", label: "Morning", startHour: 8, endHour: 12, display: "8am–12pm" },
  { id: "afternoon", label: "Afternoon", startHour: 12, endHour: 17, display: "12pm–5pm" },
  { id: "evening", label: "Evening", startHour: 17, endHour: 21, display: "5pm–9pm" },
] as const;

export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export const PLATFORMS = ["X", "LinkedIn", "Article"] as const;
