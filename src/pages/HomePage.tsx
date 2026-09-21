import { day } from '../data/day';
import { dayEvent } from '../data/calendar';
import { downloadICS, googleCalendarUrl } from '../lib/ics';
import { ScheduleTable } from '../components/ScheduleTable';
import type { Resource } from '../types';
import { downloadKind } from '../lib/links';

function ResourceLink({ resource }: { resource: Resource }) {
  if (resource.url === '#') {
    return (
      <li>
        <span className="reslink reslink--placeholder">
          <span className="reslink__label">{resource.label}</span>
          <span className="reslink__arrow">Soon</span>
        </span>
      </li>
    );
  }
  const kind = downloadKind(resource.url);
  return (
    <li>
      <a
        className="reslink"
        href={resource.url}
        target="_blank"
        rel="noopener noreferrer"
        {...(kind ? { download: '' } : {})}
      >
        <span className="reslink__label">
          {resource.label}
          {resource.note && <span className="reslink__note">{resource.note}</span>}
        </span>
        <span className="reslink__arrow">{kind === 'pdf' ? 'PDF ↓' : '↗'}</span>
      </a>
    </li>
  );
}

export function HomePage() {
  // Group resources by their optional `group`, preserving first-seen order.
  const groups: { name?: string; items: Resource[] }[] = [];
  for (const r of day.resources) {
    let g = groups.find((x) => x.name === r.group);
    if (!g) {
      g = { name: r.group, items: [] };
      groups.push(g);
    }
    g.items.push(r);
  }

  return (
    <>
      <section className="hero">
        <div className="container">
          <div className="hero__inner">
            <p className="eyebrow">CAS Gamechanger AI · UZH Executive Education</p>
            <h1>{day.title}</h1>
            <div className="hero__rule" />
            <p className="hero__lead">{day.summary}</p>
            <dl className="hero__meta">
              <div>
                <dt>Date</dt>
                <dd>{day.date}</dd>
              </div>
              <div>
                <dt>Time</dt>
                <dd>{day.hours}</dd>
              </div>
              <div>
                <dt>Place</dt>
                <dd>{day.place}</dd>
              </div>
              <div>
                <dt>Lecturer</dt>
                <dd>{day.lecturer}</dd>
              </div>
            </dl>
            <div className="hero__cta">
              <button type="button" className="btn btn--ghost" onClick={() => downloadICS(dayEvent)}>
                Add to your calendar (.ics)
              </button>
              <a
                className="btn btn--ghost"
                href={googleCalendarUrl(dayEvent)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Add to Google Calendar
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section__head">
            <h2>The day</h2>
            <p>Four blocks of 90 minutes: a lecture, then a hands-on part in the browser.</p>
          </div>
          <div className="days days--single">
            <ScheduleTable day="Saturday" date="26 September 2026" sessions={day.sessions} room={day.place} />
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <section className="resources">
            <h2>Materials</h2>
            <p className="resources__note">
              Every game and visualization of the day, by block. The slides go up once they are final.
            </p>
            {groups.map((g, gi) => (
              <div className="resgroup" key={gi}>
                {g.name && <h3 className="resgroup__title">{g.name}</h3>}
                <ul className="reslist">
                  {g.items.map((r, i) => (
                    <ResourceLink key={i} resource={r} />
                  ))}
                </ul>
              </div>
            ))}
          </section>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section__head">
            <h2>Before you come</h2>
          </div>
          <ul className="before-list">
            <li>Bring a laptop or a phone. Everything runs in the browser, and one laptop per pair is enough.</li>
            <li>The marble jar round in block 3 is played on phones, so have yours with you after lunch.</li>
            <li>Nothing to install and no account to create.</li>
          </ul>
        </div>
      </section>
    </>
  );
}
