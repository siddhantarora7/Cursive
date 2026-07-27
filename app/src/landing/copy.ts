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
  links: [
    { label: 'How it works', href: '#ghost' },
    { label: 'The feel', href: '#themes' },
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
  meta: 'Free · No account · Runs in your browser',
} as const

/*
 * The curved marquee pair. The back curve carries a message the way it actually
 * gets typed; the ribbon carries the version that gets sent. Doubled words and
 * misspellings are deliberate and should survive copy edits.
 */
export const DRAFT_TEXT =
  'ok so i think the the timeline slips, theres been alot of back and forth ' +
  'and honestly nobody really knows whats going on right now. can you check ' +
  'if the notes from yesterday went out or if their still waiting on us. i ' +
  'think someone mentioned it but no one confirmed and now im a bit lost, ' +
  'sorry for the ramble, its been a week and i keep loosing the thread'

export const CLEAN_TEXT =
  'The timeline is likely to slip. There has been a lot of back and forth, ' +
  'and no one has a clear picture yet. Could you check whether yesterday’s ' +
  'notes went out, or whether the team is still waiting on us? I think it came ' +
  'up, but nobody confirmed it. Happy to take that piece if it helps.'

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
    { cap: 'Tab', label: 'Take it', note: 'Accept the draft in front of you.' },
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
  facts: ['IndexedDB', 'No account', 'No sync', 'Nothing stored server-side'],
  link: { label: 'Read the privacy page', href: '/privacy' },
} as const

/* ----------------------------------------------------------------- plans --- */

export const PLANS = {
  heading: 'Both plans are free. One of them always will be.',
  free: {
    name: 'Free',
    price: '$0',
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
