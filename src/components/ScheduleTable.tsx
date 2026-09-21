import type { Session } from '../types';
import { SessionTypeChip } from './SessionTypeChip';
import { downloadKind } from '../lib/links';

interface Props {
  day: string;
  date: string;
  sessions: Session[];
  room?: string;
}

export function ScheduleTable({ day, date, sessions, room }: Props) {
  return (
    <div className="day">
      <div className="day__head">
        <h3>{day}</h3>
        <span className="day__meta">
          <span className="day__date">{date}</span>
          {room && <span className="day__room">{room}</span>}
        </span>
      </div>
      <div className="schedule">
        {sessions.map((s, i) => {
          // Coding exercises are prefixed with "CX" to match the course convention.
          const title = s.type === 'exercise' ? `CX ${s.title}` : s.title;
          // PDFs and notebooks are offered as a download rather than opened in
          // the browser viewer. This applies to the chips below as well as the
          // title, so a deck saves the same way whether it is reached from here
          // or from the weekend's Materials list.
          const isFile = !!s.url && downloadKind(s.url) !== null;
          const quiet = s.type === 'break' || s.type === 'tba';
          return (
            <div key={i} className={`srow${quiet ? ` srow--${s.type}` : ''}`}>
              <div className="srow__time">{s.time}</div>
              <div className="srow__body">
                {s.url ? (
                  <a
                    className="srow__title srow__title--link"
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    {...(isFile ? { download: '' } : {})}
                  >
                    {title}
                    <span className="srow__ext" aria-hidden="true">
                      {isFile ? '↓' : '↗'}
                    </span>
                  </a>
                ) : (
                  <span className="srow__title">{title}</span>
                )}
                {s.type !== 'break' && (
                  <span className="srow__meta">
                    <SessionTypeChip type={s.type} />
                    {s.links?.map((l, j) => {
                      const isLinkFile = downloadKind(l.url) !== null;
                      return (
                        <a
                          key={j}
                          className="srow__link"
                          href={l.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          {...(isLinkFile ? { download: '' } : {})}
                        >
                          {l.label}
                          <span className="srow__ext" aria-hidden="true">
                            {isLinkFile ? '↓' : '↗'}
                          </span>
                        </a>
                      );
                    })}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
