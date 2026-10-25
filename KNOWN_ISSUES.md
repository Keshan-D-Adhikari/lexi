# Known Issues

Open problems in Talking Lexi, roughly in priority order. Already fixed: API keys moved
server-side, UI and accessibility fixes, faster AI replies, and more accurate plugin
intent detection.

## High priority

### The `/api` proxy has no rate limiting
Anyone who knows a deployed site's URL can call `/api/...` and use up the API quotas
configured on the server. With paid keys (Gemini, Deepgram) this costs money.
Add per-IP rate limiting (or an auth check) in `server/apiProxy.ts` before deploying publicly.

### No automated tests or CI
There are no unit tests, including for the intent parser (`src/core/brain/intentParser.ts`),
and no CI pipeline. Regressions in intent rules or the AI fallback logic would go unnoticed.

### Parts of the AI setup and deployment are untested
- Gemini replies are tested with a real key. `gemini-flash-latest` is often overloaded
  (503), so the app falls back to `gemini-flash-lite-latest`. OpenRouter has only been tested
  with a fake key (error/fallback path).
- The Vercel function (`api/proxy.ts` + `vercel.json`) has not been tested on a real deployment.

### Browser control limitations
- Gemini's dedicated computer-use API (Interactions API) rejected follow-up turns with
  "Request blocked due to safety violations" for this project's key, so the agent uses
  regular Gemini function calling over a text view of the page instead. Pages that are
  mostly visual (maps, canvas apps, CAPTCHAs) are hard for it.
- Tested on Wikipedia and YouTube searches only. Sites that need sign-in require the user
  to log in once in the agent's Chrome profile.
- Risky-button detection is keyword-based (Buy, Pay, Send, Delete, ...) and can miss
  buttons with unusual labels.

## Medium priority

- **Type errors (3):** in `src/components/3d/HolographicCard.tsx` (`opacity` on `Material | Material[]`)
  and `src/components/3d/HolographicScene.tsx` (missing `THREE` namespace import, `number[]` passed as `Vector2`).
  `npm run typecheck` fails; `vite build` still succeeds because it does not type-check.
- **Lint errors (~45):** mostly `any` types and missing React hook dependencies
  (`react-hooks/exhaustive-deps`), which can cause stale-state bugs.
- **Bundle size ~1.4 MB (≈440 KB gzipped):** no code-splitting; AR (MediaPipe) and Holographic
  modes load up front even when unused.
- **npm audit:** 28 vulnerabilities (1 critical, 16 high).
- **Missing fonts:** Holographic cards load `/fonts/inter-bold.woff` and `/fonts/inter-regular.woff`,
  which do not exist, causing console errors.
- **Unused code and dependencies:** `@supabase/supabase-js`, `onnxruntime-web`, `PluginTest`,
  `PerformanceMonitor`, and `usePlugins` are not used.
- **Duplicate speech services:** `speechService` and `properSpeechService` overlap.
- **Extra API usage:** when both Gemini and OpenRouter are configured and Gemini takes longer
  than 2.5 s, both are called (a speed vs. cost trade-off in `src/services/aiService.ts`).

## Low priority

- **Outdated docs:** the README's AI model chain section still describes the old models
  (e.g. "Gemini 1.5 Pro"), and `PROJECT_SUMMARY.md` lists files that do not exist and calls
  the project "production-ready".
- **`.gitignore` ignores `public/`:** new assets added there will not be committed.
- **Holographic mode hides the robot:** switching to Holographic removes the 3D robot entirely.
- **English-only intents:** commands in Sinhala or Singlish (e.g. "Colombo weather eka mokakda")
  do not reach plugins or browser control; they go to the AI chat instead.
- **Sinhala mode limits:** Sinhala voice uses Gemini TTS, which has free-tier daily limits and
  adds a few seconds before Lexi starts speaking. Sinhala speech recognition was only checked
  for configuration (`si-LK`), not with a real microphone, and works only in Chrome.
