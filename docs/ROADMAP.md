# Cursive — Roadmap (deliberately NOT in v1)

Things we have explicitly decided not to build yet. If a feature idea isn't in the
phase plan in `ARCHITECTURE.md`, it lives here — not in code.

## Deferred, likely later

- ~~**Autocorrect (SymSpell).**~~ **Shipped in Phase 1** by explicit owner request
  (originally excluded): local Damerau-ED1 correction at word boundaries against a
  frequency-ranked dictionary, with flash feedback, Backspace-to-revert, and a
  session ignore list. Possible later upgrades: edit-distance-2 via true SymSpell
  deletes, user dictionary, multi-language, and retroactive re-correction of past
  words using following-word context (bigrams) — currently lone letters are fixed
  immediately at the boundary by unigram frequency instead.
  **Update 2026-07-28: distance-2 shipped**, but not via SymSpell deletes. A
  delete index at distance 2 over 82k words is ~3M entries, which is not a
  reasonable thing to hold in a writer's browser. Instead the common slice of
  the dictionary is scanned with a keyboard-aware Damerau distance
  (`core/autocorrect/slips.ts`), measured at 1.5 ms worst case. Distance 3
  remains deliberately out: measured, it corrects more real words wrongly than
  it fixes.
- **Full offline launch (service worker / PWA install).** v1 is local-first once
  loaded; installability and offline boot are a later polish item.
- **Image/table/math/dictate/print toolbar items** — Phase 4 by plan, not before.

## Ideas parked (no commitment)

- Browser extension reusing `core/` suggestion policy in other textareas.
- Real multi-tab document merging (v1 is last-writer-wins with a warning).
- More sound packs / community theme gallery.
- Monetization (would also force off Vercel Hobby — non-commercial tier).

## Never (identity guards)

- Collaboration, comments, sharing infrastructure.
- Accounts / cloud storage of documents.
- Whole-document AI agents, multi-step planning, tool use. Prompt-to-edit stays
  selection-scoped forever.
