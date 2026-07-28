/*
 * Every marketing string on the landing page lives here, so tone edits are
 * one-file edits.
 *
 * House rules: plain and confident, no hype words, no em dashes. The audience
 * is anyone who writes a lot, which means the specificity has to come from
 * concrete scenarios rather than from naming a persona. "The deadline moved to
 * Friday" earns its place; "for modern teams" does not.
 */

export const CTA = { label: 'Start writing', href: '/app' } as const

export const NAV = {
  /* Doubles as the scroll rail's stop list, so nav and rail cannot drift. */
  links: [
    { label: 'How it works', href: '#ghost' },
    { label: 'The feel', href: '#themes' },
    { label: 'Compare', href: '#compare' },
    { label: 'Free', href: '#plans' },
  ],
  repo: 'https://github.com/siddhantarora7/Cursive',
} as const

/* ------------------------------------------------------------------ hero --- */

export const HERO = {
  /* Two-tone, mapping onto ghost text: the lead is what you do, the tail is
     what Cursive does. The tail renders muted and resolves to ink once. */
  lead: 'Type half.',
  tail: 'Tab the rest.',
  sub: 'Cursive drafts the next few words as you write. If they fit, press Tab and they are yours. If not, keep typing and they step aside.',
  /*
   * The price answer belongs above the fold. It was previously one clause in
   * an 11px line under the button, and the actual answer lived in a pricing
   * section eleven sections down, which is a long way to scroll to find out
   * whether you are about to be asked for a card.
   */
  badge: 'Free forever · No account · Nothing to buy',
  meta: 'Runs in your browser · Works offline once loaded',
} as const

/*
 * The curved marquee pair.
 *
 * These are not two independent blocks of text. They are the same message
 * twice, phrase by phrase: the back curve carries it the way it actually gets
 * typed, the ribbon carries what gets sent. Pair `i` on one curve is the
 * correction of pair `i` on the other.
 *
 * For that to be legible the two have to arrive at the capsule together, so
 * both members of a pair are padded to the same length and the marquees are
 * set in the monospace face. In a monospace, equal character counts mean equal
 * rendered widths (bold included), which makes the two curves land in lockstep
 * by construction rather than by a tuned magic number that drifts.
 *
 * Doubled words and misspellings on the rough side are deliberate.
 */
const MARQUEE_PAIRS: ReadonlyArray<readonly [rough: string, clean: string]> = [
  ['ok so i think the the timeline slips', 'The timeline is likely to slip.'],
  ['theres been alot of back and forth', 'There has been a lot of back and forth,'],
  ['and honestly nobody really knows whats going on', 'and no one has a clear picture yet.'],
  ['can you check if the notes from yesterday went out', 'Could you check whether yesterday’s notes went out,'],
  ['or if their still waiting on us', 'or whether the team is still waiting?'],
  ['i think someone mentioned it but no one confirmed', 'I think it came up, but nobody confirmed it.'],
  ['sorry for the ramble its been a week', 'Happy to take that piece if it helps.'],
]

const GAP = '   '

/*
 * Kept at zero: the lag between the two curves is corrected exactly in
 * HeroMarquees by measuring each path's distance to the capsule, which lands
 * sub-pair. Rotating whole pairs here was an approximation of that and left a
 * visible fraction of a phrase out of step.
 */
const CLEAN_LEAD = 0

/** Pad both members of every pair to a common width, then join. */
function buildMarquee(which: 0 | 1, rotate = 0): string {
  const n = MARQUEE_PAIRS.length
  return Array.from({ length: n }, (_, i) => {
    const pair = MARQUEE_PAIRS[(i + rotate) % n]!
    const width = Math.max(pair[0].length, pair[1].length)
    return pair[which].padEnd(width, ' ') + GAP
  }).join('')
}

export const DRAFT_TEXT = buildMarquee(0)
export const CLEAN_TEXT = buildMarquee(1, CLEAN_LEAD)

/* ------------------------------------------------------------ meta strip --- */

/* Value plus label, the way Cluely runs its transcription metrics. These are
   claims we can stand behind, not invented traction numbers. */
export const METRICS = [
  { value: '0', label: 'accounts to create' },
  { value: '1,000', label: 'characters sent, at most' },
  { value: '0', label: 'documents on our servers' },
] as const

/* ------------------------------------------------------------ ghost text --- */

export const GHOST = {
  heading: 'Your next few words, already there.',
  body: 'Cursive reads the sentence in front of you, not your whole document. The draft arrives in gray. Tab makes it yours.',
  /* Three stages for the pinned demo. `typed` is what the writer has committed;
     `ghost` is what Cursive offers. Keep them short enough to fit one line on
     a phone without wrapping past two. */
  stages: [
    {
      typed: 'The deadline moved to Friday, which means ',
      ghost: 'we lose the buffer we planned for.',
    },
    {
      typed: 'Thanks for flagging it. The cleanest fix is probably ',
      ghost: 'to ship the smaller change first.',
    },
    {
      typed: 'No update yet, but I should ',
      ghost: 'have something to show by Thursday.',
    },
  ],
} as const

/* --------------------------------------------------------------- two-up --- */

export const TWO_UP = {
  draft: {
    before: 'Cursive ',
    chip: 'drafts',
    after: ' as you write',
    body: 'It watches the sentence in front of you and writes the next few words in gray. Tab takes them. Keep typing and they get out of the way. No panel, no chat window, no waiting for a response.',
  },
  edit: {
    before: 'When it is not right, ',
    chip: '⌘K',
    after: ' rewrites it',
    body: 'Highlight a sentence and say what should change. The edit appears inline as a suggestion you can read before it lands. Accept it or keep your version. It only ever touches what you selected.',
    /* Shown in the card's mock. */
    prompt: 'make this sharper',
    was: 'We are currently in the process of evaluating a number of options.',
    now: 'We are weighing a few options.',
  },
} as const

/* ------------------------------------------------------------- manifesto --- */

/*
 * The pinned centre-line reveal. Split on words at render time; the second
 * sentence carries the one accent colour on this part of the page.
 */
export const MANIFESTO = {
  lead: 'You don’t lose the sentence to not knowing the words.',
  accent: 'You lose it to the pause.',
} as const

/* ----------------------------------------------------------- three keys --- */

export const KEYS = {
  heading: 'The entire interface.',
  body: 'No sidebar. No chat window. Nothing to configure before you are allowed to start.',
  items: [
    { cap: 'Tab', label: 'Accept', note: 'Take the draft in front of you.' },
    { cap: '⌘K', label: 'Rewrite', note: 'Change only what you highlighted.' },
    { cap: 'Esc', label: 'Dismiss', note: 'Send it away and keep typing.' },
  ],
} as const

/* ---------------------------------------------------------------- themes --- */

export const THEMES = {
  heading: 'The same words, in whatever room you write best in.',
  body: 'Eight themes ship with the editor, each with its own paper, ink and caret. Pick one and the interface disappears behind the writing.',
  sample:
    'The room you write in matters more than anyone admits. Change the paper and the sentence changes with it.',
} as const

/* -------------------------------------------------------------- three-up --- */

export const FEATURES = {
  caret: {
    title: 'A caret that glides',
    body: 'It travels to the next character instead of teleporting there. A small thing you feel on every keystroke.',
  },
  feel: {
    title: 'Every keystroke lands',
    body: 'Key sounds, typing effects, and a quiet celebration when a streak holds. All optional, all off by default.',
  },
  fix: {
    title: '‘teh’ becomes ‘the’, before you notice',
    body: 'Common slips are corrected at the word boundary against a frequency-ranked dictionary, on your machine. Backspace puts your version back.',
  },
} as const

/* ----------------------------------------------------------------- trust --- */

export const TRUST = {
  heading: 'Your documents never leave this browser.',
  body: 'They live in IndexedDB on your own machine. There is no account to make and nothing to sync. When a suggestion is requested, Cursive sends at most a thousand characters from around your caret, and nothing else.',
  link: { label: 'Read the privacy page', href: '/privacy' },
  /*
   * The rotating strip. Every one of these is checkable against the repo; none
   * is a claim about traction, a customer count, or a partner logo we do not
   * have. `icon` keys into primitives/Icons.
   */
  facts: [
    { icon: 'database', label: 'Stored in IndexedDB' },
    { icon: 'noAccount', label: 'No account, ever' },
    { icon: 'noSync', label: 'Nothing syncs' },
    { icon: 'shield', label: '1,000 characters, max' },
    { icon: 'eye', label: 'No telemetry' },
    { icon: 'offline', label: 'Works offline once loaded' },
    { icon: 'keyboard', label: 'Tab to accept' },
    { icon: 'palette', label: 'Eight themes' },
    { icon: 'spark', label: 'Typing effects, optional' },
    { icon: 'plug', label: 'Bring your own key' },
    { icon: 'download', label: 'Export any document' },
    { icon: 'code', label: 'Open source' },
  ],
} as const

/* ----------------------------------------------------------------- plans --- */

export const PLANS = {
  heading: 'Both plans are free. There is nothing to buy.',
  /*
   * Stated plainly because it is true and because it removes the question
   * every pricing section otherwise plants. There is no Stripe account, no
   * checkout and no paid tier; pretending otherwise to look established is
   * the kind of small lie a reader finds out about at exactly the wrong
   * moment.
   */
  noPaid:
    'There is no paid tier, no checkout, and no card on file. If that ever changes it will be said here first, and the free tier stays.',
  free: {
    name: 'Free',
    price: '$0',
    priceNote: 'forever',
    blurb: 'The whole editor, with a daily allowance of AI suggestions.',
    points: [
      'Unlimited documents, local to this browser',
      'Every theme, font and typing effect',
      'A daily allowance of ghost text',
      'No account, no tracking',
    ],
    cta: 'Start writing',
  },
  byok: {
    name: 'Bring your own key',
    price: '$0',
    priceNote: 'you pay your provider',
    blurb: 'Plug in an API key you already have and drop the allowance.',
    points: [
      'Unlimited ghost text and ⌘K edits',
      'The key stays in this browser and never reaches us',
      'Works with the providers you already pay for',
      'Switch back to free whenever',
    ],
    cta: 'Use your own key',
  },
  /* Honest footnote: the free tier routes through free provider APIs. */
  note: 'Free suggestions run through free provider tiers, and those providers may train on the text a suggestion sends. Bring your own key or switch AI off if that is not acceptable for what you are writing.',
} as const

export const SOURCE = {
  heading: 'Read the code that runs in your browser.',
  body: 'The suggestion policy, the storage layer and the proxy are all in the open. The privacy claims on this page are checkable rather than promised.',
  cta: 'View on GitHub',
} as const


/* --------------------------------------------------------------- compare --- */

/*
 * Verifiable attributes only. Every row is something a reader can check for
 * themselves in ten seconds, which is the only kind of comparison worth
 * publishing: no "easier to use", no "more powerful", no invented benchmark.
 * Where a rival genuinely wins or ties, the row says so.
 */
export const COMPARE = {
  heading: 'Where your words actually live.',
  body: 'The honest version. Cursive is not better at everything; it is built on a different assumption about whose machine your writing sits on.',
  columns: ['Cursive', 'Google Docs', 'Notion AI', 'ChatGPT'],
  rows: [
    { label: 'Documents stored', values: ['This browser', 'Google’s servers', 'Notion’s servers', 'OpenAI’s servers'] },
    { label: 'Account required', values: ['No', 'Yes', 'Yes', 'Yes'] },
    { label: 'How AI reaches you', values: ['Inline, at the caret', 'Side panel', 'Side panel', 'Separate chat'] },
    { label: 'Works offline', values: ['Yes, after first load', 'Partly', 'No', 'No'] },
    { label: 'Sees your whole document', values: ['Never', 'Yes', 'Yes', 'Only what you paste'] },
    { label: 'Price', values: ['$0', '$0', 'From $10/mo', 'From $20/mo'] },
  ],
  note: 'Compared against the free tier of each where one exists, in July 2026.',
} as const

/* ------------------------------------------------------------------- faq --- */

export const FAQ = {
  heading: 'The questions people actually ask.',
  items: [
    {
      q: 'Which models write the suggestions?',
      a: 'The free tier runs through Groq and Google’s free API tiers. Bring your own key and it goes straight from your browser to whichever provider you chose, under your own terms.',
    },
    {
      q: 'What happens when I hit the daily allowance?',
      a: 'Nothing breaks. Ghost text stops appearing and the editor carries on exactly as it was. Add your own key, or come back tomorrow.',
    },
    {
      q: 'Can I get my writing out?',
      a: 'Yes, as Markdown, at any time. Worth doing: documents live in this browser, so clearing your browser data deletes them.',
    },
    {
      q: 'Does it work offline?',
      a: 'The editor does, once the page has loaded. Suggestions need a connection, so they pause and everything else keeps working.',
    },
    {
      q: 'Is my API key safe?',
      a: 'It is kept in this browser’s localStorage and never reaches our servers. Requests made with it go directly from your browser to your provider.',
    },
    {
      q: 'What actually gets sent when I ask for a suggestion?',
      a: 'At most a thousand characters from around your caret, your optional intent line, and a random anonymous id. Never the whole document, and nothing at all while AI is off.',
    },
  ],
} as const

/* ---------------------------------------------------------------- finale --- */

export const FINALE = {
  heading: 'Start writing.',
  sub: 'Nothing to install, nothing to sign up for. The page is already warm.',
  meta: 'Opens at /app · Works offline once loaded',
} as const

export const FOOTER = {
  repo: 'https://github.com/siddhantarora7/Cursive',
  privacy: '/privacy',
  line: 'Built by students.',
} as const
