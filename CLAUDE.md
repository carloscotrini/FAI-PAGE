# CLAUDE.md : FAI-PAGE, the participant page for the Foundations of AI day

Public repository `carloscotrini/FAI-PAGE`, served by GitHub Pages at
https://carloscotrini.github.io/FAI-PAGE/ . It is the participant-facing page for
one teaching day: Foundations of AI, CAS "Gamechanger AI", UZH Executive
Education, Saturday 26 September 2026. Created 21.09.2026 at the lecturer's
request, "like the other modules before", which means the BMAI HS26 site.

## Where it comes from

A copy of the code of `eth-bmai-hs26/BMAI-PAGE` (Vite 5, React 18,
react-router-dom 6, TypeScript 5), cut down from four weekends to one day:

- One route. The weekend pages, the calendar page and the office hours page are
  gone, and so are their components.
- No logo and no ETH colours. The BMAI stylesheet carried ETH's corporate
  palette; it now uses the ink blue and sepia of the day's Paper and Grid decks,
  with the Okabe-Ito blue as the second accent. The CSS tokens are `--brand-*`.
  The page names the programme in text and carries no institutional wordmark,
  because it is the lecturer's page and UZH's own identity is theirs to use.
- `lab` sessions are labelled "Hands-on": nothing on this day is a coding exercise.
- The calendar export is one timed event, written in UTC (CEST is UTC+2 on the
  day), so it needs no VTIMEZONE block.

`base: './'` in `vite.config.ts` and hash routing are what make assets and deep
links work under the `/FAI-PAGE/` subpath. Both are load bearing.

## The content, and the rules for changing it

- `src/data/day.ts` is the single source of truth. The plan it follows lives in
  the private repository `carloscotrini/fai-hs26-private` (`docs/schedule.md`
  and `blocks/`). When the plan changes, change `day.ts` to match.
- **Blocks 3 and 4 were swapped on 23.09.2026**, on the lecturer's order:
  statistical learning theory and agentic AI at 13:00, ensembles at 15:00, so
  the marble jar and the UN games are block 4 now. The private repository's
  `materials/block-3/` and `materials/block-4/` folders and their PDFs swapped
  the same day, so `block-N.pdf` is block N's deck again.
- **Block 4 was replaced on 24.09.2026**, on the lecturer's word after the
  client's review: ensembles went, because Day 1 already teaches regularisation
  and random forests, and **embeddings and retrieval augmented generation**
  came in. Its one Materials entry is the yogurt cup game,
  `public/viz/yogurt-cups/`, a copy of the BMAI course site's page (through
  `fai-hs26-private/materials/viz/yogurt-cups/`), played in pairs in the
  middle of the lecture, so the schedule shows the lecture in two halves around
  it (15:00, 15:15, 15:35: the minute budget of the deck's speaker notes). The block 4 deck prints that address in a QR code.
  Later that day the lecturer asked for "all the materials on the website":
  the UN games, marble jar and forest pages are listed again under a last
  Materials group, **More to explore**, as optional extras outside every
  session, and the closing quiz's join page (`MENTI`, menti.com) is listed
  under block 4. `ScheduleTable` does not render `SOON`: a chip set to it is a
  dead link, so a deck that is not published gets no chip at all.
- **The slides are the FULL decks since 24.09.2026, on the lecturer's word**
  ("put all the materials on the website"). `public/slides/block-N.pdf` are
  unchanged copies of `fai-hs26-private/materials/block-N/slides/block-N.pdf`,
  the PDFs projected in the room, linked as the "Slides" chip of each lecture.
  Blocks 1 to 3 keep the MINIMAL versions of 23.09.2026 beside them as a
  "Short version" chip: `public/slides/block-N-minimal.pdf`, copies of
  `materials/minimal/`, which is rebuilt only on his command. Block 4's minimal
  cut was the retired ensembles block and was withdrawn. The procedure is in
  `README.md`. On his word the slides are not listed under Materials.
- **One link, one place.** Since the evening of 23.09.2026 the schedule
  carries nothing but those Slides chips, and every game, visualization and
  outside page is listed once, under Materials, with its note. Until then each
  game was also a chip on its session, so every link showed twice (the UN games
  three times), and the lecturer asked for the duplicates to go. Add a new page
  under Materials only.
- `public/viz/` holds copies of `fai-hs26-private/materials/viz/`, runtime files
  only. The rsync command in `README.md` refreshes them. Each page is browser
  only with vendored libraries, so it works from this subpath as it does from a
  laptop.
- **The grasshopper is one built file.** `public/viz/grasshopper/cx_grasshopper.html`
  is a copy of the private repository's `materials/viz/grasshopper/cx_grasshopper.html`,
  which `build.py` there inlines from `src/` (the rsync in `README.md` excludes
  `grasshopper/src`). It was adapted on 23.09.2026 at the lecturer's request (tap
  controls for phones and tablets, a Measure station with friendly numbers, the
  two-knob station of the slides, the slides' notation, the code station in
  Python), and the same file replaced the grasshopper on the BMAI course site
  that day. Refresh it with a plain copy after `python3 build.py` there.
- **Withdrawing a page is a manual `git rm` here.** The rsync in `README.md` has no
  `--delete`, so a page removed from the private repository stays published until
  its directory is removed from `public/viz/` by hand. On 23.09.2026 the genie's
  riddle and the approximation game were withdrawn that way, and
  `house-prices-rm-gd/` was replaced by `house-prices-rm/` (block 1) and
  `two-grasshoppers/` (block 2). The same day `square-root-show/`, the opening
  quiz show, was added; its `tests/` folder is not copied (`--exclude tests`).
- The spy game is LINKED on purpose, never copied here: it is served by the
  BMAI course site, where the agentic AI slide (block 3) points. Until
  24.09.2026 the marble jar guessing page (`carloscotrini/fai-hs26`) and its
  shared sheet were linked the same way; they left the page with the ensembles
  block, and the guessing page is still live in that repository.

## Deploying

A push to `main` runs `.github/workflows/deploy.yml`: `npm ci`, `npm run build`
(`tsc -b` then `vite build`), then `actions/upload-pages-artifact@v3` and
`actions/deploy-pages@v4`. Pages is configured with `build_type: workflow`. A
push is a publication: the page is public the moment the run finishes.

Check a deploy with:

```bash
gh run list -R carloscotrini/FAI-PAGE --limit 3
curl -s -o /dev/null -w "%{http_code}\n" https://carloscotrini.github.io/FAI-PAGE/
```

## Maintenance contract

- This file is the working memory for this repository. After any major change,
  meaning a new section or page, a changed deploy, a changed data format, or
  material published or withdrawn, UPDATE THIS FILE IN THE SAME COMMIT.
- A CLAUDE.md that describes a layout the repository no longer has is worse than
  none. Keep it concrete: real file names, real commands, and the gotchas that
  cost someone an hour.
