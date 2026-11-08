# Assets and dependencies

- Environment meshes, avatar meshes, icons, canvas textures, placeholder graphic and Web Audio compositions are original code created for this project. No Roblox assets or commercial models are used.
- The eight bundled sample photographs depict a fictional couple and were generated for this project. They are examples, not photographs of the owner. Replace them with photos you are entitled to use.
- Three.js 0.180.0 — MIT, https://github.com/mrdoob/three.js/blob/dev/LICENSE
- Vite 7.3.1 — MIT, https://github.com/vitejs/vite/blob/main/LICENSE
- Supabase JS 2.95.3 — MIT, https://github.com/supabase/supabase-js/blob/master/LICENSE
- fflate 0.8.2 — MIT, https://github.com/101arrowz/fflate/blob/master/LICENSE
- MediaPipe Tasks Vision 0.10.32 — Apache-2.0, https://github.com/google-ai-edge/mediapipe/blob/master/LICENSE
- Face Landmarker model (float16, version 1) from Google's MediaPipe model distribution, downloaded by `scripts/prepare-assets.mjs`; model documentation: https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker

Dependency notices remain in installed packages and production bundles. The face model and WASM runtime are copied/downloaded at build time and served locally at runtime. Only upload faces with permission, and use music/photos you own or are licensed to share. No paid API or third-party identity service is used.

QR codes: qrcode 1.5.4 (MIT), generated locally without sending private invitation URLs to a QR service. Reference outfit images supplied by the user guided original procedural geometry; they are not redistributed as character models.
