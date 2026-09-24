import type { Day } from '../types';

/**
 * Single source of truth for the day's content.
 *
 * The plan behind it lives in the lecturer's private repository
 * carloscotrini/fai-hs26-private (docs/schedule.md and blocks/). When the plan
 * changes, change this file to match; nothing else on the site hand-maintains
 * a time or a title.
 */

/**
 * Placeholder for material that is not published yet. Renders greyed out as
 * "Soon" instead of a link, so the page can go live before the files do.
 */
export const SOON = '#';

/**
 * A lecture deck hosted by THIS site, from `public/slides/`. BASE_URL rather
 * than a bare './' so the link survives a change to `base` in vite.config.ts;
 * under hash routing the document URL is always the site root, so a relative
 * href resolves from any route.
 */
export const deck = (file: string): string => `${import.meta.env.BASE_URL}slides/${file}`;

/**
 * A game or visualization hosted by this site, from `public/viz/<name>/`. Each
 * one is a copy of a browser-only page from the lecturer's private repository
 * (materials/viz/), opens with no build step, and carries its own libraries.
 */
export const viz = (name: string, page = 'index.html'): string =>
  `${import.meta.env.BASE_URL}viz/${name}/${page}`;

/** The spy game, served by the BMAI course site, where part 2's slide points. */
export const SPY_GAME = 'https://eth-bmai-hs26.github.io/BMAI-PAGE/viz/we2/spy-game/';

export const PLAYGROUND = 'https://playground.tensorflow.org';

/**
 * The homework round, from `public/homework/`. A copy of
 * fai-hs26-private/materials/homework/index.html, which is the original; the
 * Python that reads the completion codes back stays in that private repository,
 * because it holds the answer key. Copy the page again whenever it changes there.
 */
export const HOMEWORK = `${import.meta.env.BASE_URL}homework/`;

export const day: Day = {
  title: 'Foundations of AI',
  theme: 'How machines learn from data, from a first guess to language models and agents',
  date: 'Saturday 26 September 2026',
  dateISO: '2026-09-26',
  hours: '08:30 to 16:30',
  place: 'Stampfenbachstrasse 73/75, Zürich',
  lecturer: 'Carlos Cotrini',
  summary:
    'One day, four blocks. It starts from the oldest idea in the field, learning by guessing and correcting, and follows it through gradient descent and neural networks to statistical learning theory, language models and agents, then ends with embeddings and retrieval: how a text becomes a list of numbers, and how a language model finds a company\'s own documents and answers from them. Every block has a hands-on part that runs in the browser, with nothing to install.',

  // Each lecture's "Slides" chip is the MINIMAL, manager-level version of its
  // block, published 23.09.2026 on the lecturer's word: public/slides/, copied
  // unchanged from fai-hs26-private/materials/minimal/block-N-minimal.pdf. That
  // folder is rebuilt only on his command; copy again only when he says so.
  // Block 4 was replaced on 24.09.2026: ensembles went (Day 1 teaches them) and
  // embeddings and RAG came in. Its minimal deck in public/slides/ is still the
  // ensembles one, so block 4 carries no Slides chip until he asks for the new
  // slides to go up. (ScheduleTable does not render SOON, so a chip set to SOON
  // would be a dead link.)
  // The yogurt cup game is played in the middle of that lecture, as at BMAI.
  sessions: [
    {
      time: '08:30',
      title: 'Learning by guessing: Popper, Robbins-Monro and house prices',
      type: 'lecture',
      links: [{ label: 'Slides', url: deck('block-1-minimal.pdf') }],
    },
    {
      time: '09:30',
      title: 'Guess, check, correct',
      type: 'lab',
    },
    { time: '10:00', title: 'Coffee break, until 10:30', type: 'break' },
    {
      time: '10:30',
      title: 'Gradient descent and neural networks',
      type: 'lecture',
      links: [{ label: 'Slides', url: deck('block-2-minimal.pdf') }],
    },
    {
      time: '11:30',
      title: 'The grasshopper, and a network that bends',
      type: 'lab',
    },
    { time: '12:00', title: 'Lunch, until 13:00', type: 'break' },
    {
      time: '13:00',
      title: 'Statistical learning theory and agentic AI',
      type: 'lecture',
      links: [{ label: 'Slides', url: deck('block-3-minimal.pdf') }],
    },
    {
      time: '14:00',
      title: 'The Hidden Layer: play the spy game',
      type: 'lab',
    },
    { time: '14:30', title: 'Coffee break, until 15:00', type: 'break' },
    {
      time: '15:00',
      title: 'Embeddings and retrieval augmented generation',
      type: 'lecture',
    },
    {
      time: '15:20',
      title: 'The yogurt cup game, in pairs',
      type: 'lab',
    },
    {
      time: '15:40',
      title: 'From embeddings to answers: chunks, clusters and RAG',
      type: 'lecture',
    },
    { time: '16:20', title: 'Wrap-up, questions and feedback', type: 'lecture' },
  ],

  // The slides are NOT listed here: the lecturer wants them in the schedule,
  // one "Slides" chip per lecture (23.09.2026). And every game is listed ONLY
  // here, since the same evening: the schedule carried them too, and he asked
  // for the duplicate links to go. One link, one place.
  resources: [
    {
      group: 'Block 1, learning by guessing',
      label: 'SQUARE ONE, the opening show',
      url: viz('square-root-show'),
      note: 'The quiz show that opens the day: guess the side of Switzerland folded into a square, solve w = 1 + 1/w, then watch a machine play.',
    },
    {
      group: 'Block 1, learning by guessing',
      label: 'Square roots, by hand',
      url: viz('square-roots-robbins-monro', 'cx_robbins-monro.html'),
      note: 'Two problems solved with the same update rule: a square root first, then the equation w = 1 + 1/w.',
    },
    {
      group: 'Block 1, learning by guessing',
      label: 'Price the street',
      url: viz('price-the-street', 'cx_house-pricing-game.html'),
      note: 'Appraise houses you have never seen: one guess, one miss, one correction at a time.',
    },
    {
      group: 'Block 1, learning by guessing',
      label: 'House prices, one house at a time',
      url: viz('house-prices-rm'),
      note: 'Ten houses and a line. Each round one house, picked at random, nudges the price per square metre by a fixed step.',
    },

    {
      group: 'Block 2, gradient descent and neural networks',
      label: 'Grasshopper',
      url: viz('grasshopper', 'cx_grasshopper.html'),
      note: 'You are a grasshopper in a valley you cannot see. Find the lowest point.',
    },
    {
      group: 'Block 2, gradient descent and neural networks',
      label: 'One grasshopper, then two',
      url: viz('two-grasshoppers'),
      note: 'The grasshopper on the loss curve of ten houses, then stopping distances with two knobs: a bowl, and two grasshoppers hopping at once.',
    },
    {
      group: 'Block 2, gradient descent and neural networks',
      label: 'Ramps, bumps, anything',
      url: viz('universal-approximation'),
      note: 'Why a neural network can draw any shape, built by hand out of ramps.',
    },
    {
      group: 'Block 2, gradient descent and neural networks',
      label: 'The curve and the landscape',
      url: viz('nn-fit-landscape'),
      note: 'A neural network learning a day of bike-sharing demand (synthetic data), beside the landscape its training walks down.',
    },
    {
      group: 'Block 2, gradient descent and neural networks',
      label: 'TensorFlow Playground',
      url: PLAYGROUND,
      note: 'Pick the spiral dataset, then add neurons and layers until the two colours separate.',
    },

    {
      group: 'Block 3, statistical learning theory and agentic AI',
      label: 'The Hidden Layer, the spy game',
      url: SPY_GAME,
      note: 'Play the mission by hand, then watch an AI agent play it. Playing by hand needs no key.',
    },

    {
      group: 'Block 4, embeddings and retrieval',
      label: 'The yogurt cup game',
      url: viz('yogurt-cups'),
      note: 'Two players and only words between them. The sender sees five pictures, on a phone if you like; the receiver finds them, in order, on the laptop. Your score is the time.',
    },

    {
      group: 'After the day',
      label: 'The homework round',
      url: HOMEWORK,
      note: 'Twelve questions, about half an hour. Four of them you answer by opening a page from the day and looking. It marks itself, explains every answer, and hands you a code at the end.',
    },
  ],
};
