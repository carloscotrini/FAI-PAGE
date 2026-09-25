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
  middle of the lecture. The block 4 deck prints that address in a QR code.
  Later that day the lecturer asked for "all the materials on the website":
  the UN games, marble jar and forest pages are listed again under a last
  Materials group, **More to explore**, as optional extras outside every
  session. `ScheduleTable` does not render `SOON`: a chip set to it is a
  dead link, so a deck that is not published gets no chip at all.
- **Block 4 was collapsed to two rows on 25.09.2026** ("the fourth block
  looks very fragmented"): one lecture row, 15:00, titled "Embeddings and
  retrieval augmented generation", with only its Slides chip; no separate
  row for the yogurt cup game or for a lecture continuation. Its chip moved
  onto the 16:20 wrap-up row instead, which carries only that one chip. The
  closing quiz on Mentimeter was never finished ("I did not have time to
  finish it") and its resource entry, its `MENTI` constant and its session
  chip are all removed; nothing on the page names it.
- **The slides are the FULL decks only, since 25.09.2026, on the lecturer's
  word.** `public/slides/block-N.pdf` are unchanged copies of
  `fai-hs26-private/materials/block-N/slides/block-N.pdf`, the PDFs projected
  in the room, linked as the "Slides" chip of each lecture. The MINIMAL cut
  published 23.09.2026 as a "Short version" chip was removed the same way
  block 4's was: "remove all the short versions, we keep now the full
  versions." `public/slides/block-N-minimal.pdf` are deleted for all four
  blocks; nothing in `day.ts` references `materials/minimal/` any more. On
  his word the slides are not listed under Materials.
- **Games are chipped twice, on purpose, since 25.09.2026.** From the evening
  of 23.09.2026 to 25.09.2026 the schedule carried only the Slides chips, and
  every game was listed once, under Materials, with its note ("one link, one
  place"). The lecturer reversed that on 25.09.2026 ("I need chips also in
  the schedule for the games"): every game is now ALSO a chip on the session
  it belongs to, reusing the exact `{label, url}` pair of its Materials entry
  (see the comment above `sessions` in `day.ts`) so the two copies cannot
  drift apart; only the note stays Materials-only. Add a new page in BOTH
  places: a `links` entry on its session in `sessions`, and an entry in
  `resources` with its group and note.
- **The two grasshopper games swapped sessions on 25.09.2026**, the lecturer's
  own correction: `viz('grasshopper', ...)` (the single valley game) is now
  the 10:30 lecture's chip, and `viz('two-grasshoppers')` joined the other
  three games on the 11:30 hands-on. Only the chip placement moved; the
  Materials list and both games' notes are unchanged.
- **The homework is a Colab notebook since 25.09.2026**, on the lecturer's
  word: `public/homework/first-neural-network.ipynb`, a copy of
  `fai-hs26-private/materials/homework/notebook/first-neural-network.ipynb`,
  which is built there by `build_notebook.py` and must never be edited by hand.
  Its Materials link is the `NOTEBOOK` constant in `day.ts`, which opens it in
  Colab through `colab.research.google.com/github/carloscotrini/FAI-PAGE/blob/main/...`.
  **That address reads the file from this repository's `main` branch**, so a
  push here publishes a change to the notebook and the Pages deploy has nothing
  to do with it. The **solution notebook and the solved HTML are the answer key
  and are NOT here**; they stay in the private repository until the lecturer
  says otherwise.
  The twelve question round, `public/homework/index.html`, is still served and
  still listed, relabelled as an optional self check: the notebook replaced it
  as the homework. Four lines in `day.ts` remove it if he would rather it went.
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
