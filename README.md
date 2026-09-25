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
| `public/slides/` | The four full decks, `block-N.pdf` (24.09.2026), and the short versions of blocks 1 to 3, `block-N-minimal.pdf` (23.09.2026) |

## Publishing the slides

Since 24.09.2026 the page serves the FULL deck of each block, the PDF that is
projected, on the lecturer's word ("put all the materials on the website").
After a deck changes in the private repository `carloscotrini/fai-hs26-private`,
copy it again from the site root and push:

```bash
for n in 1 2 3 4; do cp ../fai-hs26-private/materials/block-$n/slides/block-$n.pdf public/slides/; done
```

Blocks 1 to 3 also keep the MINIMAL version published on 23.09.2026, the
manager-level cut in `materials/minimal/`, as a "Short version" chip. That folder
is rebuilt only on the lecturer's command, and so is this copy:

```bash
cp ../fai-hs26-private/materials/minimal/block-[123]-minimal.pdf public/slides/
```

Block 4's minimal cut was the retired ensembles block and was withdrawn on
24.09.2026. Each lecture in the schedule links its deck as a "Slides" chip,
`deck('block-N.pdf')` in `src/data/day.ts`, and blocks 1 to 3 a "Short version"
chip beside it; on the lecturer's word the slides are not listed under
Materials.

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

One thing on the page is a link rather than a copy, on purpose: the spy game,
served by the BMAI course site, where the agentic AI slide (block 3) points.
The marble jar guessing page was the second until 24.09.2026, when block 4
became embeddings and RAG.
