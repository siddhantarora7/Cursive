# Manual performance checklist (Phase 2 exit criteria)

Run on a mid-tier laptop profile: Chrome DevTools → Performance → CPU **4× slowdown**.
Repeat after any change to the editor hot path, caret, or FX layer.

## Protocol

1. **Baseline typing latency** — effects OFF, sounds OFF, paper theme.
   DevTools Performance → record a 30 s burst of fast typing.
   - [ ] No `keydown`→paint over 16 ms attributable to our code
   - [ ] No long tasks (> 50 ms) during typing
2. **Everything on** — sparks + streak + shake ON, sound `thock`, midnight theme,
   Demo mode ON. Record 60 s of sustained fast typing (aim > 80 WPM for combo 3).
   - [ ] Steady 60 fps in the FPS meter (Rendering → Frame rendering stats)
   - [ ] FX frame cost ≤ 2 ms (Performance profile: `FxLayer.frame` self time)
   - [ ] Keystroke-to-paint unchanged vs. baseline (FX must add zero input latency)
3. **Ghost text under load** — with a live provider, type through several
   suggestion cycles (show → consume-advance → Tab accept).
   - [ ] No layout thrash on ghost show/advance (single decoration update)
   - [ ] Accept fade never janks the following keystrokes
4. **Degradation** — CPU 20× slowdown, type hard for 30 s.
   - [ ] FX self-degrades (halves, then disables) instead of dragging input
   - [ ] Typing stays responsive with FX degraded
5. **Idle cost** — stop typing, leave the tab focused 2 min.
   - [ ] FX rAF loop parked (no rAF activity in profile)
   - [ ] Caret loop parked between blinks; zero timers besides autosave/combo tick
6. **Background cost** — switch tabs 1 min.
   - [ ] No rAF, no audio, no timers beyond the 400 ms combo tick
7. **Memory** — Performance monitor over 10 min of writing.
   - [ ] JS heap flat (particle pool is preallocated; no per-frame allocation)

Record results (pass/fail + numbers) in the PR description before shipping a
release that touches the feel layer.
