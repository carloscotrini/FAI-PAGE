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
- **The slides are the MINIMAL versions, published 23.09.2026 on the
  lecturer's word.** `public/slides/block-N-minimal.pdf` are unchanged copies of
  `fai-hs26-private/materials/minimal/block-N-minimal.pdf`, the manager-level
  cut of each block. That folder is rebuilt only on his command, so copy it
  again, or publish the full decks instead, only when he says so. The
  procedure is in `README.md`.
- `public/viz/` holds copies of `fai-hs26-private/materials/viz/`, runtime files
  only. The rsync command in `README.md` refreshes them. Each page is browser
  only with vendored libraries, so it works from this subpath as it does from a
  laptop.
- **Withdrawing a page is a manual `git rm` here.** The rsync in `README.md` has no
  `--delete`, so a page removed from the private repository stays published until
  its directory is removed from `public/viz/` by hand. On 23.09.2026 the genie's
  riddle and the approximation game were withdrawn that way, and
  `house-prices-rm-gd/` was replaced by `house-prices-rm/` (block 1) and
  `two-grasshoppers/` (block 2). The same day `square-root-show/`, the opening
  quiz show, was added; its `tests/` folder is not copied (`--exclude tests`).
- Two things are LINKED on purpose, never copied here. The marble jar guessing
  page is served by `carloscotrini/fai-hs26`, because the ensembles slide
  (block 4) prints that address and its QR code; a copy here would drift the
  day its sheet address is filled in. The spy game is served by the BMAI course
  site, where the agentic AI slide (block 3) points.

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
