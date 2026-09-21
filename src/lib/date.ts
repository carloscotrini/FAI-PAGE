/** Small, dependency-free date helpers working on ISO `YYYY-MM-DD` strings. */

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const WEEKDAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export { MONTH_NAMES, WEEKDAYS_SHORT };

export const pad2 = (n: number): string => String(n).padStart(2, '0');

export const toISO = (year: number, month0: number, day: number): string =>
  `${year}-${pad2(month0 + 1)}-${pad2(day)}`;

/** Add `days` to an ISO date, returning a new ISO date (UTC-safe). */
export function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

export const daysInMonth = (year: number, month0: number): number =>
  new Date(year, month0 + 1, 0).getDate();

/** Weekday index of the 1st of a month, Monday = 0 … Sunday = 6. */
export const firstWeekdayMonday = (year: number, month0: number): number =>
  (new Date(year, month0, 1).getDay() + 6) % 7;

/** Format an ISO date for display, e.g. "Fri 26 June 2026". */
export function formatLongDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const wd = WEEKDAYS_SHORT[(date.getDay() + 6) % 7];
  return `${wd} ${d} ${MONTH_NAMES[m - 1]} ${y}`;
}
