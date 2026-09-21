export type SessionType =
  | 'lecture'
  | 'exercise'
  | 'lab'
  | 'quiz'
  | 'break'
  | 'project'
  | 'tba';

export interface Session {
  time: string;
  title: string;
  type: SessionType;
  /** Optional single link for this session. */
  url?: string;
  /** Optional multiple labelled links, e.g. the games of one hands-on slot. */
  links?: Resource[];
}

export interface Resource {
  label: string;
  url: string;
  /**
   * Optional sub-section heading on the Materials list, e.g. "Slides" or
   * "Block 2". Resources sharing a group are rendered together under that
   * heading, and groups appear in first-seen order.
   */
  group?: string;
  /** One plain sentence under the link, saying what the thing is. */
  note?: string;
}

/** The one day this site is about. */
export interface Day {
  title: string;
  /** Short subtitle under the title. */
  theme: string;
  /** Human-readable date, e.g. "Saturday 26 September 2026". */
  date: string;
  /** ISO date of the day. */
  dateISO: string;
  hours: string;
  place: string;
  lecturer: string;
  summary: string;
  sessions: Session[];
  resources: Resource[];
}
