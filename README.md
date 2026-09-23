# FAI-PAGE

The participant page for **Foundations of AI**, the technical day of the CAS
"Gamechanger AI" (UZH Executive Education), Saturday 26 September 2026, 08:30 to
16:30, Stampfenbachstrasse 73/75, Zürich. Lecturer: Carlos Cotrini.

Live at https://carloscotrini.github.io/FAI-PAGE/

It shows the day's schedule, every game and visualization of the day, by block,
and an "add to calendar" button. It is built from the code of the BMAI HS26 course
site (https://github.com/eth-bmai-hs26/BMAI-PAGE), reduced from four weekends to
one day.

## Run it

```bash
npm ci
npm run dev       # local development server
npm run build     # type check and build into dist/
npm run preview   # serve dist/ locally
```

Pushing to `main` deploys: `.github/workflows/deploy.yml` builds the site and
publishes `dist/` to GitHub Pages.

## Where things are

| Path | What it is |
|---|---|
| `src/data/day.ts` | Every time, title and link on the page. Edit this to change the content |
| `src/data/calendar.ts` | The day as one calendar event (times in UTC) |
| `src/pages/HomePage.tsx` | The one page: hero, schedule, materials, "before you come" |
| `public/viz/` | Copies of the day's games and visualizations, runtime files only |
| `public/slides/` | The four minimal decks, `block-N-minimal.pdf`, published 23.09.2026 |

## Publishing the slides

Since 23.09.2026 the page serves the MINIMAL version of each block, the
manager-level cut in `materials/minimal/` of the private repository
`carloscotrini/fai-hs26-private`. That folder is rebuilt only on the lecturer's
command, and so is this copy. When he says so, copy again from the site root:

```bash
cp ../fai-hs26-private/materials/minimal/block-*-minimal.pdf public/slides/
```

then push. Each lecture in the schedule links its deck as a "Slides" chip,
`deck('block-N-minimal.pdf')` in `src/data/day.ts`; on the lecturer's word the
slides are not listed under Materials. To publish a full deck instead, copy
`materials/block-N/slides/block-N.pdf` and point that chip at
`deck('block-N.pdf')`.

## Refreshing a visualization

The pages under `public/viz/` are copies of `materials/viz/` in the private
repository, without their build and verification files. After a change there,
copy again from the site root:

```bash
rsync -a --exclude precompute --exclude "*.py" --exclude "verify*" \
  --exclude README.md --exclude CLAUDE.md --exclude PROVENANCE.md \
  --exclude .gitignore --exclude __pycache__ --exclude docs --exclude .DS_Store \
  --exclude "*.sh" --exclude "grasshopper/src" \
  ../fai-hs26-private/materials/viz/ public/viz/
```

The grasshopper is served as ONE built file, `grasshopper/cx_grasshopper.html`.
Its editable source is `grasshopper/src/` in the private repository, and
`python3 build.py` there rebuilds the single file; `src/` itself is never
copied here.

Two things on the page are links rather than copies, on purpose: the marble jar
guessing page, served by https://github.com/carloscotrini/fai-hs26 because the
ensembles slide (block 4) prints its address in a QR code, and the spy game,
served by the BMAI course site, where the agentic AI slide (block 3) points.
