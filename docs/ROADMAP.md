# Cursive — Roadmap (deliberately NOT in v1)

Things we have explicitly decided not to build yet. If a feature idea isn't in the
phase plan in `ARCHITECTURE.md`, it lives here — not in code.

## Deferred, likely later

- **Autocorrect (SymSpell).** Excluded from v1 on purpose. A possible later
  differentiator: local, instant, dictionary-based correction that pairs well with
  the "typing feel" identity — but it changes text the user typed, which is a trust
  and feel risk that needs its own design pass (undo semantics, per-word revert,
  visual feedback). Revisit after Phase 3 ships.
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
