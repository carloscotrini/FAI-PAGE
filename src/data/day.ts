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
 * carloscotrini/fai-hs26, because the block-3 slide prints this address and
 * encodes it in a QR code. Link it; do not copy it here, or the two copies
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
    'One day, four blocks. It starts from the oldest idea in the field, learning by guessing and correcting, and follows it through gradient descent and neural networks, through ensembles and the wisdom of the crowd, to statistical learning theory, language models and agents. Every block has a hands-on part that runs in the browser, with nothing to install.',

  sessions: [
    {
      time: '08:30',
      title: 'Learning by guessing: Popper, Robbins-Monro and house prices',
      type: 'lecture',
    },
    {
      time: '09:30',
      title: 'Guess, check, correct',
      type: 'lab',
      links: [
        { label: 'Square roots, by hand', url: viz('square-roots-robbins-monro', 'cx_robbins-monro.html') },
        { label: "The genie's riddle", url: viz('genie-game', 'cx_genie-game.html') },
        { label: 'Approximation game', url: viz('approximation-game', 'cx_approximation-game.html') },
        { label: 'Price the street', url: viz('price-the-street', 'cx_house-pricing-game.html') },
        { label: 'House prices, two ways', url: viz('house-prices-rm-gd') },
      ],
    },
    { time: '10:00', title: 'Coffee break, until 10:30', type: 'break' },
    {
      time: '10:30',
      title: 'Gradient descent and neural networks',
      type: 'lecture',
    },
    {
      time: '11:30',
      title: 'The grasshopper, and a network that bends',
      type: 'lab',
      links: [
        { label: 'Grasshopper', url: viz('grasshopper', 'cx_grasshopper.html') },
        { label: 'The curve and the landscape', url: viz('nn-fit-landscape') },
        { label: 'Ramps, bumps, anything', url: viz('universal-approximation') },
        { label: 'TensorFlow Playground', url: PLAYGROUND },
      ],
    },
    { time: '12:00', title: 'Lunch, until 13:00', type: 'break' },
    {
      time: '13:00',
      title: 'Ensembles: the wisdom of the crowd',
      type: 'lecture',
      links: [
        { label: 'Your row and your code', url: GUESSING_PAGE },
        { label: 'The marble jar', url: viz('marble-jar', 'wisdom-of-crowds.html') },
      ],
    },
    {
      time: '14:00',
      title: 'Bagging, random forests and the UN games',
      type: 'lab',
      links: [
        { label: 'The forest grows', url: viz('random-forest-deepdive') },
        { label: 'The UN games', url: viz('un-games') },
      ],
    },
    { time: '14:30', title: 'Coffee break, until 15:00', type: 'break' },
    {
      time: '15:00',
      title: 'Statistical learning theory and agentic AI',
      type: 'lecture',
    },
    {
      time: '16:00',
      title: 'The Hidden Layer: play the spy game',
      type: 'lab',
      links: [{ label: 'The spy game', url: SPY_GAME }],
    },
    { time: '16:20', title: 'Wrap-up, questions and feedback', type: 'lecture' },
  ],

  resources: [
    // The decks are SOON until the lecturer has made the cuts for the day.
    // Publishing: copy block-N.pdf from fai-hs26-private/materials/block-N/slides/
    // into public/slides/ and replace SOON with deck('block-N.pdf').
    { group: 'Slides', label: 'Block 1, learning by guessing', url: SOON },
    { group: 'Slides', label: 'Block 2, gradient descent and neural networks', url: SOON },
    { group: 'Slides', label: 'Block 3, ensembles', url: SOON },
    { group: 'Slides', label: 'Block 4, statistical learning theory and agentic AI', url: SOON },

    {
      group: 'Block 1, learning by guessing',
      label: 'Square roots, by hand',
      url: viz('square-roots-robbins-monro', 'cx_robbins-monro.html'),
      note: 'Two problems solved with the same update rule: a square root, and the equation w = 1 + 1/w.',
    },
    {
      group: 'Block 1, learning by guessing',
      label: "The genie's riddle",
      url: viz('genie-game', 'cx_genie-game.html'),
      note: 'The genie grants nothing until you name its number. One clue, and a guess you keep correcting.',
    },
    {
      group: 'Block 1, learning by guessing',
      label: 'Approximation game',
      url: viz('approximation-game', 'cx_approximation-game.html'),
      note: 'Guess the side of a square of unknown area, and watch whether it fits the gap.',
    },
    {
      group: 'Block 1, learning by guessing',
      label: 'Price the street',
      url: viz('price-the-street', 'cx_house-pricing-game.html'),
      note: 'Appraise houses you have never seen: one guess, one miss, one correction at a time.',
    },
    {
      group: 'Block 1, learning by guessing',
      label: 'House prices, learned two ways',
      url: viz('house-prices-rm-gd'),
      note: 'Ten houses and a line, fitted one house at a time and then by gradient descent, with the grasshopper on the loss curve.',
    },

    {
      group: 'Block 2, gradient descent and neural networks',
      label: 'Grasshopper',
      url: viz('grasshopper', 'cx_grasshopper.html'),
      note: 'You are a grasshopper in a valley you cannot see. Find the lowest point.',
    },
    {
      group: 'Block 2, gradient descent and neural networks',
      label: 'The curve and the landscape',
      url: viz('nn-fit-landscape'),
      note: 'A neural network learning a day of bike-sharing demand (synthetic data), beside the landscape its training walks down.',
    },
    {
      group: 'Block 2, gradient descent and neural networks',
      label: 'Ramps, bumps, anything',
      url: viz('universal-approximation'),
      note: 'Why a neural network can draw any shape, built by hand out of ramps.',
    },
    {
      group: 'Block 2, gradient descent and neural networks',
      label: 'TensorFlow Playground',
      url: PLAYGROUND,
      note: 'Pick the spiral dataset, then add neurons and layers until the two colours separate.',
    },

    {
      group: 'Block 3, ensembles',
      label: 'Your row and your code, for the marble jar',
      url: GUESSING_PAGE,
      note: 'Enter your birthday and three digits of your phone number, and it tells you where to write your guess.',
    },
    {
      group: 'Block 3, ensembles',
      label: 'The marble jar',
      url: viz('marble-jar', 'wisdom-of-crowds.html'),
      note: 'How many marbles are in the jar? The room, averaged, against every single guess.',
    },
    {
      group: 'Block 3, ensembles',
      label: 'The forest grows',
      url: viz('random-forest-deepdive'),
      note: 'A tree cannot draw a spiral. A hundred of them, each grown on a resample and averaged, can.',
    },
    {
      group: 'Block 3, ensembles',
      label: 'The UN games',
      url: viz('un-games'),
      note: 'Spurious regression in ten scenes: two models that predict equally well and disagree about what mattered.',
    },

    {
      group: 'Block 4, statistical learning theory and agentic AI',
      label: 'The Hidden Layer, the spy game',
      url: SPY_GAME,
      note: 'Play the mission by hand, then watch an AI agent play it. Playing by hand needs no key.',
    },
  ],
};
