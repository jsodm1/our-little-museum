# Verification — version 2

## Passed

- `npm test`: all three automated suites pass. They check all eight additional scene builders and geometry budgets, walkable spawn locations, interactive stations, room/bench collision behavior, and sample-memory references.
- `npm run build`: Vite production build succeeds; all imports resolve. The generated output includes local photos, icons, face-model assets and the MediaPipe runtime.
- Browser: welcome screen, all nine location selections, gallery photo viewer, portrait photo display, Next/Previous navigation, avatar preview, name/glasses editing, local save/reload, face-photo upload preview, sound on/off, ZIP backup download and ZIP restore.
- Responsive layouts inspected at 390×844 portrait and 844×390 landscape. Phone editor and movement controls are available.
- Supabase integration exercised with three temporary accounts: username registration/login; owner creation; outsider read denial; outsider avatar-update denial with an empty partner slot; one-use invitation acceptance; third-person rejection; partner avatar-only editing; owner edit permission; concurrent-save conflict rejection; private chat; presence ownership; private photo upload and signed-URL isolation.
- Permission revocation was re-tested after moving privileged implementations into the private schema. Unauthorized publication was rejected immediately.
- Supabase security advisor reviewed: private recovery/rate-limit tables intentionally have no client policy. The optional leaked-password protection advisory remains dependent on Auth settings/plan.
- Temporary integration accounts and their test worlds/messages/presence were removed after verification. No real user photos were used in testing.

## Verification boundaries

- The available cloud browser disables WebGL. Browser interaction and visual checks used the software renderer, which draws the same Three.js scene geometry. GPU lighting/shadows, device frame rates and iPhone Safari-specific fullscreen behavior were not tested on physical devices.
- Online behavior was tested through independent authenticated API clients. A two-human, two-phone session was not observed.
- Face upload processing and preview were exercised. Exact likeness is not guaranteed; centered-crop fallback is supported and described in the editor.
- Audio control state was tested; speaker quality was not measured.
- Browser fullscreen remains subject to browser support and user gestures. Installation does not promise offline caching.
