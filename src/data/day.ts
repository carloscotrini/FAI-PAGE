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
 * The homework notebook, opened straight in Google Colab. Colab reads the file
 * from GitHub, so this address serves whatever is on `main` of the ORG copy,
 * uzh-fai-hs26/uzh-fai-hs26.github.io. Pushing there publishes a change to the
 * notebook, and no Pages deploy is involved. Both copies of this site point at
 * the org repository, so the link a participant clicks never says carloscotrini. The original is fai-hs26-private/materials/homework/
 * notebook/, built by build_notebook.py; the solution and the solved HTML are
 * the answer key and stay in that private repository.
 */
export const NOTEBOOK =
  'https://colab.research.google.com/github/uzh-fai-hs26/uzh-fai-hs26.github.io/blob/main/public/homework/house-prices.ipynb';

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

  // Since 24.09.2026, on the lecturer's word ("put all the materials on the
  // website"), each lecture's "Slides" chip is the FULL deck projected in the
  // room: public/slides/block-N.pdf, copied unchanged from
  // fai-hs26-private/materials/block-N/slides/block-N.pdf.
  //
  // Since 25.09.2026 every game is ALSO chipped on its own session, on the
  // lecturer's word ("I need chips also in the schedule for the games"). This
  // reverses the "One link, one place" decision of 23.09.2026: a game now
  // shows twice, once here and once under Materials, on purpose. Each chip
  // below reuses the exact {label, url} pair of its Materials entry, so the
  // two never drift apart; only the note stays Materials-only.
  //
  // Also since 25.09.2026, on the lecturer's word: the "Short version" chip
  // (the 23.09.2026 minimal cut) is gone from every block; only the full deck
  // is published now, and public/slides/block-N-minimal.pdf were deleted.
  // The Grasshopper and One-grasshopper-then-two chips were swapped between
  // the 10:30 lecture and the 11:30 hands-on (his own correction of the split
  // restored the day before). Block 4 was collapsed from four rows to two,
  // because "the fourth block looks very fragmented": one lecture row with
  // just its Slides chip, and the yogurt cup game's chip moved onto the
  // 16:20 wrap-up row, its only chip. The closing quiz (Mentimeter) is
  // unpublished ("I did not have time to finish it") and dropped everywhere.
  //
  // Since 26.09.2026, on the lecturer's word: every lecture also has a
  // "Handout" chip BESIDE its "Slides" chip, never instead of it ("the
  // handouts are next to the actual slides on the website, do not replace
  // those"). public/slides/block-N-handout.pdf is one page per frame, the
  // frame's last click, copied unchanged from fai-hs26-private
  // materials/block-N/slides/block-N-handout.pdf, which
  // materials/handouts/build_handouts.py cuts out of the same deck PDFs.
  //
  // Also since 26.09.2026, on the lecturer's word ("Slides annotated landed.
  // Put them on the website"): an "Annotated slides" chip sits right after
  // each lecture's "Slides" chip, ahead of its "Handout", and never instead of
  // either. public/slides/block-N-annotated.pdf are his own iPad exports of the
  // deck with his handwriting from the day, copied byte for byte from
  // ~/Downloads (CLAUDE.md lists the sheets he inserted and the damaged fonts
  // of the export). The closing quiz's copy is a chip of its own on the wrap-up
  // row, beside the quiz it annotates.
  sessions: [
    {
      time: '08:30',
      title: 'Learning by guessing: Popper, Robbins-Monro and house prices',
      type: 'lecture',
      links: [
        { label: 'Slides', url: deck('block-1.pdf') },
        { label: 'Annotated slides', url: deck('block-1-annotated.pdf') },
        { label: 'Handout', url: deck('block-1-handout.pdf') },
        { label: 'SQUARE ONE, the opening show', url: viz('square-root-show') },
      ],
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
      links: [
        { label: 'Slides', url: deck('block-2.pdf') },
        { label: 'Annotated slides', url: deck('block-2-annotated.pdf') },
        { label: 'Handout', url: deck('block-2-handout.pdf') },
        { label: 'Grasshopper', url: viz('grasshopper', 'cx_grasshopper.html') },
      ],
    },
    {
      time: '11:30',
      title: 'The grasshopper, and a network that bends',
      type: 'lab',
      links: [
        { label: 'One grasshopper, then two', url: viz('two-grasshoppers') },
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
      links: [
        { label: 'Slides', url: deck('block-3.pdf') },
        { label: 'Annotated slides', url: deck('block-3-annotated.pdf') },
        { label: 'Handout', url: deck('block-3-handout.pdf') },
      ],
    },
    {
      time: '14:00',
      title: 'The Hidden Layer: play the spy game',
      type: 'lab',
      links: [{ label: 'The Hidden Layer, the spy game', url: SPY_GAME }],
    },
    { time: '14:30', title: 'Coffee break, until 15:00', type: 'break' },
    {
      time: '15:00',
      title: 'Embeddings and retrieval augmented generation',
      type: 'lecture',
      links: [
        { label: 'Slides', url: deck('block-4.pdf') },
        { label: 'Annotated slides', url: deck('block-4-annotated.pdf') },
        { label: 'Handout', url: deck('block-4-handout.pdf') },
      ],
    },
    {
      time: '16:20',
      title: 'Wrap-up, questions and feedback',
      type: 'lecture',
      links: [
        { label: 'The yogurt cup game', url: viz('yogurt-cups') },
        { label: 'The closing quiz', url: deck('closing-quiz.pdf') },
        { label: 'The closing quiz: annotated', url: deck('closing-quiz-annotated.pdf') },
        { label: 'The closing quiz: answers', url: deck('closing-quiz-answers.pdf') },
      ],
    },
    // The homework sits at the end of the schedule as if it were another
    // block, on the lecturer's word of 25.09.2026, rather than only as a line
    // under Materials. "At home" stands in for a clock time: it is the one row
    // that is not on Saturday.
    {
      time: 'At home',
      title: 'The project: your first neural network',
      type: 'project',
      links: [{ label: 'Open it in Colab', url: NOTEBOOK }],
    },
  ],

  // Every game is ALSO listed here, under Materials, by block, with its note.
  // Since 25.09.2026 this duplicates the session chips above on purpose; see
  // the comment there.
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

    // The pages of the ensembles block, retired from the day on 24.09.2026
    // because Day 1 teaches its topics. Listed again the same day on the
    // lecturer's word, "put all the materials on the website", as optional
    // extras. Not part of any session.
    {
      group: 'More to explore',
      label: 'The UN games',
      url: viz('un-games'),
      note: "You are the UN's new forecaster. Eleven scenes: a model that memorises the countries it saw, one built from nonsense that scores perfectly on them, and two models that predict about equally well and disagree about what mattered.",
    },
    {
      group: 'More to explore',
      label: 'The marble jar',
      url: viz('marble-jar', 'wisdom-of-crowds.html'),
      note: 'How many marbles are in the jar? A crowd of guesses, averaged, against every single guess.',
    },
    {
      group: 'More to explore',
      label: 'The forest grows',
      url: viz('random-forest-deepdive'),
      note: 'A tree cannot draw a spiral. A hundred of them, each grown on a resample and averaged, can.',
    },

    // The notebook is THE homework since 25.09.2026, on the lecturer's word,
    // and the ONLY one: "remove the homework from the website, it is only the
    // neural network thingy" (25.09.2026). The twelve question round that used
    // to sit under this as an optional self check is withdrawn, page and all,
    // and lives on only in the private repository.
    {
      group: 'After the day',
      label: 'The homework: your first neural network',
      url: NOTEBOOK,
      note: 'About an hour, in Google Colab. You build a small neural network and train it to price houses, then test it on forty it has never seen. Five places need your input and everything else is written for you. No installation, and no experience.',
    },
  ],
};
