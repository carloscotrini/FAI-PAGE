import type { CourseEvent } from '../data/calendar';

/** Escape text per RFC 5545. */
const esc = (s: string): string =>
  s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

const stamp = (): string =>
  new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');

/** A VCALENDAR string holding the one timed event. */
export function buildICS(ev: CourseEvent): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Foundations of AI 2026//Course page//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${ev.uid}@fai-hs26`,
    `DTSTAMP:${stamp()}`,
    `DTSTART:${ev.startUTC}`,
    `DTEND:${ev.endUTC}`,
    `SUMMARY:${esc(ev.title)}`,
    `LOCATION:${esc(ev.location)}`,
    `DESCRIPTION:${esc(ev.note)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  // RFC 5545 requires CRLF line endings.
  return lines.join('\r\n');
}

/** Trigger a download of the event as an .ics file. */
export function downloadICS(ev: CourseEvent, filename = 'foundations-of-ai-2026-09-26.ics'): void {
  const blob = new Blob([buildICS(ev)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** "Add to Google Calendar" template URL for the event. */
export function googleCalendarUrl(ev: CourseEvent): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: ev.title,
    dates: `${ev.startUTC}/${ev.endUTC}`,
    location: ev.location,
    details: ev.note,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
