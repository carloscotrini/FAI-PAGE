import { day } from './day';

/**
 * The day as one calendar event, with its real hours.
 *
 * Times are written in UTC so that every calendar reads them the same way
 * without a VTIMEZONE block: Zurich is on CEST (UTC+2) on 26 September 2026, so
 * 08:30 to 16:30 local is 06:30 to 14:30 UTC.
 */
export interface CourseEvent {
  uid: string;
  title: string;
  /** Start and end as iCalendar UTC stamps, YYYYMMDDTHHMMSSZ. */
  startUTC: string;
  endUTC: string;
  location: string;
  note: string;
}

export const dayEvent: CourseEvent = {
  uid: 'fai-2026-09-26',
  title: `${day.title} (CAS Gamechanger AI)`,
  startUTC: '20260926T063000Z',
  endUTC: '20260926T143000Z',
  location: 'Stampfenbachstrasse 73/75, 8006 Zürich',
  note: `${day.theme}. Lecturer: ${day.lecturer}.`,
};
