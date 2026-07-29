# Can free-tier models carry ghost text?

Measured 2026-07-28 with `app/scripts/eval-suggestions.ts` against a 42-fixture
corpus (`app/scripts/fixtures/suggestions.json`) covering mid-word, boundary and
sentence-end carets across narrative, technical, email and argumentative prose,
plus six deliberate traps. Every response passed through the shipping
`vetSuggestion`, so the reject rates below are the ones users experience.

Raw data: `app/scripts/results/2026-07-28T15-24-33-groq.json`.

## The headline

**Free-tier 70B is good enough to be the default. It is not good enough to be
trusted.** Those are different claims and both matter.

"BYOK is the product, free is the demo" is *not* the right conclusion — the free
tier produces usable suggestions at good latency. But there is one failure mode
no prompt or filter fixed, and it is the one that can damage a writer.

## Latency — comfortably inside budget

| model | p50 | p95 |
|---|---:|---:|
| llama-3.3-70b-versatile | 300 ms | 529 ms |
| llama-3.1-8b-instant | 218 ms | 346 ms |

`ARCHITECTURE.md` targets p50 < 600 ms. The 70B model meets it with room to
spare, measured from a laptop — the deployed proxy sits closer to Groq. **The
existing 70B-first chain order is correct and needs no change.** Latency was
suspected to be the reason to demote it; it isn't.

## Quality — 70B is usable, 8B is not

Hand-graded across 14 representative fixtures:

- **70B: roughly 10/14 good, 2 bad, 2 correctly silent.** It lands register
  ("raise the old brass knocker and let it fall"), completes mid-word cleanly,
  and even picks up a set-up metaphor ("a guess wearing the *clothing of a
  scientific prediction*").
- **8B: materially worse.** It produces ungrammatical joins ("I won't be able to"
  + "available to attend the meeting"), drifts register, and gets technical
  semantics backwards — for a transaction that rolls back it wrote "the schema
  is left in an inconsistent state", which is the opposite of true.

8B should stay where it is: a fallback for when 70B's quota is spent, not a peer.

## Prompt variants — no measurable gain

Two alternatives were tested against the shipping prompt:

- **Voice conditioning** (reserving ~250 chars of the existing 1,000-char window
  for the writer's own earlier sentences) produced **output identical to the
  baseline in 19 of 42 cases on 70B**. The exemplars are drawn from the same
  window the model already reads, so it was largely re-showing the model text it
  had. No improvement in silence rate or trap behaviour.
- **Restructured intent** (a labelled `<document-purpose>` block plus explicit
  rules) changed outputs more often but improved nothing measurable: identical
  trap failures, same reject rate.

**Neither was shipped.** The brief asked for voice conditioning; the measurement
says it does not earn its place inside a fixed context budget. Worth revisiting
only if the budget ever grows, which the privacy contract forbids.

## The unfixed failure: invented facts

The statistic trap — `"Between 2010 and 2020, median rent in the city rose by "` —
was failed by **every model in every variant, 6/6**:

> "nearly twenty five percent due to various economic factors"
> "over 50 percent, far exceeding inflation rates nationwide"
> "approximately 40 percent to over 3 thousand dollars"

The intent variant's system prompt says verbatim *"Never invent a specific fact,
name, or number"*. It did anyway. The quality filter cannot catch this: the text
is well-formed, in-register, and plausible. It is indistinguishable from a good
suggestion by every syntactic signal available.

A writer who taps Tab here now has a fabricated statistic in their draft with no
marker that it was invented. This is the strongest argument in the product for
never rendering suggestions as *authority* — and it is a property of the model
tier, not of the prompt.

**Addressed 2026-07-28, with both of the honest options rather than one.**

The filter now drops any continuation that introduces a number the draft does
not already contain — digits, `percent`, and the scale words (`hundred`,
`thousand`, `million`…). The rule is blunt deliberately: a number in prose is
nearly always a factual claim, and a claim is the one thing a next-word
predictor has no business supplying. Small number words (`one of the reasons`,
`a few days`) are not matched; they are rhetorical, not quantitative. A figure
the writer typed themselves stays in context, so continuing *after* a number
still works.

Replayed over the stored 252 responses: **12 newly dropped, and all 12 are
cases the corpus already wanted dropped** — 6/6 of the statistic trap, four
invented figures on `edge-06-numbers` (whose fixture note reads "silence is an
acceptable outcome"), and one invented delivery date on `eml-05-signoff`.

And Settings now says, in the writer's words rather than a disclaimer's:
suggestions finish sentences, they don't know things — good enough to type
with, never good enough to cite. The filter catches invented *numbers*. It
cannot catch an invented claim in plain prose, and pretending otherwise in the
UI would be its own kind of dishonesty.

## Completions that never ended a sentence

Reported from real use: you could press Tab all day and never once be handed a
full stop. Measured on the same 42 fixtures against `llama-3.3-70b-versatile`,
this was not a model limitation — it was the prompt teaching it. The
instruction said "stop at a natural phrase boundary", and both few-shot
examples ended on a dangling word (`trots away into`, `we last spoke and`). The
models copied the examples faithfully.

| | ends a sentence | trails off on a function word | median words | p50 | p95 |
|---|---:|---:|---:|---:|---:|
| before | 0 / 42 (0%) | 5 | 8 | 287 ms | 358 ms |
| after | 41 / 42 (98%) | 0 | 6 | 289 ms | 330 ms |

The instruction now asks for the sentence to be finished when it fits, and the
examples stopped modelling the behaviour being complained about. Suggestions
also got **shorter** — median 8 words to 6 — which independently helps the
other half of the same report, that long completions are too speculative to
accept. Latency is unchanged.

98% is a strong swing, and worth watching: near enough every suggestion now
closes its sentence. That is the right default for a tool you accept with one
key, but if it starts to feel eager, the lever is the `endings` variant in
`scripts/eval-suggestions.ts` — it is kept alongside `current` precisely so the
next change can be measured rather than argued about.

## Filter changes made, and validated

The measurement showed the filter erring in **both** directions. Two changes,
both re-validated by replaying the stored raw responses through the new filter
(`app/scripts/revet.ts`, no API calls):

1. **Too tight.** When the caret sits after a complete word with no trailing
   space ("…was worth"), and the model returned "it to you", the filter dropped
   it because "worthit" is not a dictionary word. Now, if the trailing fragment
   is itself a complete word, the missing leading space is supplied.
2. **Too loose.** A stutter at a completed boundary ("…and " + "and then") is
   now rejected; the existing repeat check only caught repeats of four
   characters or more.

Replay result: **17 suggestions rescued, 0 newly dropped, 234 unchanged.**

The reject rate is 7–10%, not the "high" rate the brief anticipated. That
expectation was based on the filter being too loose; it is only loose in the one
way it cannot detect — semantic and factual error. A syntactic filter cannot
raise its reject rate against well-formed wrong text without also destroying
well-formed right text.

## What this experiment cannot tell you

- **No paid-model ceiling.** No BYOK-class key was available, so there is no
  reference point. This shows free models are *a* ceiling, not that they are
  *the* ceiling. Re-run with `--models anthropic:...` when a key exists.
- **Gemini is unmeasured.** Both `gemini-2.5-flash-lite` and
  `gemini-3.5-flash-lite` returned sustained 429s and exhausted the retry
  budget — the free daily quota was spent by an earlier run. The third link in
  the provider chain is therefore untested.
- **Note for whoever re-runs this:** the chain in `.env.example` pins
  `gemini-2.5-flash-lite`, but `gemini-3.5-flash-lite` and `gemini-3.1-flash-lite`
  are now available on the same free tier. Worth measuring before the next
  chain decision.

## Bottom line for the launch story

The pricing copy does not need to change. Free tier + 70B is a real product, not
a demo. BYOK is the upgrade for volume and for people who want a stronger model
— not the price of getting anything usable.

The thing to be careful about in the copy is accuracy, not quality: this feature
finishes sentences well and invents facts confidently, and it should never be
described in a way that implies otherwise.
