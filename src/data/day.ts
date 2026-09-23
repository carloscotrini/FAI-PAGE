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

/**
 * The marble jar guessing page. Hosted on its own, by the public repository
 * carloscotrini/fai-hs26, because the ensembles deck (block 4) prints this
 * address and encodes it in a QR code. Link it; do not copy it here, or the two copies
 * drift apart the day the sheet address is filled in.
 */
export const GUESSING_PAGE = 'https://carloscotrini.github.io/fai-hs26/marble-jar-guessing/';

/** The spy game, served by the BMAI course site, where part 2's slide points. */
export const SPY_GAME = 'https://eth-bmai-hs26.github.io/BMAI-PAGE/viz/we2/spy-game/';

export const PLAYGROUND = 'https://playground.tensorflow.org';

export const day: Day = {
  title: 'Foundations of AI',
  theme: 'How machines learn from data, from a first guess to language models and agents',
  date: 'Saturday 26 September 2026',
  dateISO: '2026-09-26',
  hours: '08:30 to 16:30',
  place: 'Stampfenbachstrasse 73/75, Zürich',
  lecturer: 'Carlos Cotrini',
  summary:
    'One day, four blocks. It starts from the oldest idea in the field, learning by guessing and correcting, and follows it through gradient descent and neural networks to statistical learning theory, language models and agents, then ends with ensembles and the wisdom of the crowd. Every block has a hands-on part that runs in the browser, with nothing to install.',

  sessions: [
    {
      time: '08:30',
      title: 'Learning by guessing: Popper, Robbins-Monro and house prices',
      type: 'lecture',
      links: [{ label: 'SQUARE ONE, the opening show', url: viz('square-root-show') }],
    },
    {
      time: '09:30',
      title: 'Guess, check, correct',
      type: 'lab',
      links: [
        { label: 'Square roots, by hand', url: viz('square-roots-robbins-monro', 'cx_robbins-monro.html') },
        { label: 'Price the street', url: viz('price-the-street', 'cx_house-pricing-game.html') },
        { label: 'House prices, one house at a time', url: viz('house-prices-rm') },
      ],
    },
    { time: '10:00', title: 'Coffee break, until 10:30', type: 'break' },
    {
      time: '10:30',
      title: 'Gradient descent and neural networks',
      type: 'lecture',
      links: [{ label: 'One grasshopper, then two', url: viz('two-grasshoppers') }],
    },
    {
      time: '11:30',
      title: 'The grasshopper, and a network that bends',
      type: 'lab',
      links: [
        { label: 'Grasshopper', url: viz('grasshopper', 'cx_grasshopper.html') },
        { label: 'Ramps, bumps, anything', url: viz('universal-approximation') },
        { label: 'The curve and the landscape', url: viz('nn-fit-landscape') },
        { label: 'TensorFlow Playground', url: PLAYGROUND },
      ],
    },
    { time: '12:00', title: 'Lunch, until 13:00', type: 'break' },
    {
      time: '13:00',
      title: 'Statistical learning theory and agentic AI',
      type: 'lecture',
    },
    {
      time: '14:00',
      title: 'The Hidden Layer: play the spy game',
      type: 'lab',
      links: [{ label: 'The spy game', url: SPY_GAME }],
    },
    { time: '14:30', title: 'Coffee break, until 15:00', type: 'break' },
    {
      time: '15:00',
      title: 'Ensembles: the wisdom of the crowd',
      type: 'lecture',
      links: [
        { label: 'Your row and your code', url: GUESSING_PAGE },
        { label: 'The marble jar', url: viz('marble-jar', 'wisdom-of-crowds.html') },
      ],
    },
    {
      time: '16:00',
      title: 'Bagging, random forests and the UN games',
      type: 'lab',
      links: [
        { label: 'The forest grows', url: viz('random-forest-deepdive') },
        { label: 'The UN games', url: viz('un-games') },
      ],
    },
    { time: '16:20', title: 'Wrap-up, questions and feedback', type: 'lecture' },
  ],

  resources: [
    // Published 23.09.2026 on the lecturer's word: the MINIMAL, manager-level
    // version of each block, copied unchanged from
    // fai-hs26-private/materials/minimal/block-N-minimal.pdf into public/slides/.
    // That folder is rebuilt only on his command; copy again only when he says so.
    { group: 'Slides', label: 'Block 1, learning by guessing', url: deck('block-1-minimal.pdf') },
    { group: 'Slides', label: 'Block 2, gradient descent and neural networks', url: deck('block-2-minimal.pdf') },
    { group: 'Slides', label: 'Block 3, statistical learning theory and agentic AI', url: deck('block-3-minimal.pdf') },
    { group: 'Slides', label: 'Block 4, ensembles', url: deck('block-4-minimal.pdf') },

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
      group: 'Block 4, ensembles',
      label: 'Your row and your code, for the marble jar',
      url: GUESSING_PAGE,
      note: 'Nothing to type: it picks four letters for you and tells you which row of the shared sheet to write your guess in.',
    },
    {
      group: 'Block 4, ensembles',
      label: 'The marble jar',
      url: viz('marble-jar', 'wisdom-of-crowds.html'),
      note: 'How many marbles are in the jar? The room, averaged, against every single guess.',
    },
    {
      group: 'Block 4, ensembles',
      label: 'The forest grows',
      url: viz('random-forest-deepdive'),
      note: 'A tree cannot draw a spiral. A hundred of them, each grown on a resample and averaged, can.',
    },
    {
      group: 'Block 4, ensembles',
      label: 'The UN games',
      url: viz('un-games'),
      note: 'Spurious regression in eleven scenes: a model built from nonsense that scores perfectly on the countries it saw, and two models that predict about equally well and disagree about what mattered.',
    },
  ],
};
