import type { SessionType } from '../types';

/**
 * Every hands-on part of this day runs in the browser and nobody writes code,
 * so the BMAI "Lab Session" becomes "Hands-on", and "Coding Exercise" is kept
 * only because the type exists.
 */
const LABELS: Record<SessionType, string> = {
  lecture: 'Lecture',
  exercise: 'Coding Exercise',
  lab: 'Hands-on',
  quiz: 'Quiz',
  project: 'Project',
  break: 'Break',
  tba: 'To be announced',
};

export function SessionTypeChip({ type }: { type: SessionType }) {
  return <span className={`chip chip--${type}`}>{LABELS[type]}</span>;
}

export { LABELS as sessionTypeLabels };
