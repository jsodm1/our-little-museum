# Our Little World

A romantic, full-screen Three.js world for two. Expanded from **Our Little Museum**.

**Open:** https://jsodm1.github.io/our-little-museum/  
**Source:** https://github.com/jsodm1/our-little-museum

## Start here — no coding required

1. Open the website and choose **Make it yours** or **Customize**.
2. In **Characters**, change both names, clothing, hairstyle and colors. Upload a front-facing photograph to make a stylized likeness. Drag the preview to turn it. Adjust face width, height and eye size. Save your changes.
3. In **Photographs**, select a memory, replace its image and edit its title, date and description. Add more memories if needed.
4. Write a personal message in **Love letter**. It appears at the final photograph and letter stations.
5. Choose a starting place and atmosphere in **World settings**.
6. Open **Sound** to choose one of three original synthesized soundtracks or upload your own MP3. Audio starts only after a button press.
7. Click the names at the top → **Download backup**. Keep the ZIP file safe. It includes your custom photos, faces, story and uploaded music.

Local edits stay in this browser's IndexedDB. They do not automatically reach GitHub or another device. Clearing browser data can erase them. Backups can be restored as a new local world.

## Share privately with one person

The published site is already connected to the owner's **free Supabase project**. No paid account or payment details are required to use the app.

1. Open **Together → Create account**. Choose a unique lowercase username (4–24 characters: letters, numbers, underscores) and a password of at least 10 characters.
2. **Download and keep the recovery code.** No email is collected. This code is the only password-reset method. Keep it private, like a password.
3. Choose **Create private world** to upload the current world and custom media.
4. Choose **Create partner link**, copy it, and send it privately to your partner.
5. Your partner opens that link, creates their own account or signs in, then chooses **Accept invitation**.
6. Open the same shared world from Together on both devices. Each person moves their own character. Send hearts, chat, or invite each other to a location or photograph.

An invitation expires after two days and works once. The first different signed-in account to accept becomes the partner. Each world has at most two member accounts; each owner can create three shared worlds. A different couple can create their own separate world.

Only the owner edits shared content and both avatars. The partner independently controls their own character and can send messages. The database enforces these rules, not just the buttons. Stale edits are rejected rather than overwriting newer saves: reload the saved version and reapply your changes.

Use **Reload saved version** after the other person publishes changes. Travel and photo invitations appear in Together; they do not force the other person's camera to move. Motion uses a private database heartbeat roughly once per second with interpolated rendering. Slow connections update less often. When your partner is away, their character becomes an animated companion.

Photos and uploaded audio live in a private bucket, with temporary signed URLs. The public repository contains only the fictional sample photos. Chat is private to members but is **not end-to-end encrypted**. The account/project administrator can access stored records. A love letter is readable by both members once saved; there is no secret scheduled-release promise.

## Places

| Place | Corners to explore |
|---|---|
| Memory Museum | Photo collection, favorite memory wall, final letter |
| Garden Park | Rose walk, bridge, picnic lawn, lantern grove |
| Sunset Beach | Shoreline, boardwalk, lighthouse, bonfire cove, seaside picnic |
| Our Little Café | Window table, coffee counter, record corner, garden terrace |
| Starlight Rooftop | City overlook, stargazing, pergola, midnight letter |
| Forest Retreat | Woodland trail, cabin, waterfall, campfire |
| Our Cozy Home | Living room, kitchen, quiet room, green balcony |
| Winter Village | Village square, frozen pond, cabin porch, wishing tree |
| Celebration Garden | Flower arch, dinner table, dance-floor area, surprise pavilion |

All environments are actual Three.js geometry. Places are separate scenes; use the Places panel to travel. They are not one continuous open world. Each scene has bounds and furniture/terrain collisions. Location illustrations in the chooser are decorative icons; the world itself is rendered in 3D.

## Controls and phones

- **WASD / arrow keys:** move; **drag:** orbit camera; **wheel / pinch:** zoom.
- **Tap the ground:** walk toward that point. If an obstacle blocks the straight path, steer around it.
- **E / tap frame / interaction prompt:** open a memory or station.
- **Escape:** close a photo or panel. Arrow keys change photos while the viewer is open.
- **Phone joystick:** move. Drag elsewhere to look around.
- **Heart:** affectionate pose and floating hearts. **Crosshair:** recenter. **Camera:** download a picture of the 3D scene.
- **Fullscreen:** supported browsers request fullscreen on Enter or with the toolbar button. Browsers always allow exiting.
- **iPhone:** Safari → Share → Add to Home Screen → open the saved icon for an app-like full-screen view. Safari may keep browser bars when opened as a regular tab; websites cannot forcibly hide them.

Portrait and landscape layouts are included. The manifest and home-screen icons are local. The application does not currently install an offline service worker. Run the local project for use without a hosted frontend; online sharing always requires internet.

## Download and run the source

Install **Node.js 22.12 or newer**, then:

```sh
git clone https://github.com/jsodm1/our-little-museum.git
cd our-little-museum
npm install
npm run dev
```

Open the localhost address printed by Vite. To test a phone on the same Wi-Fi, open the printed Network address and permit the local development port through your computer's firewall if needed.

The first dev/build command copies the installed MediaPipe WASM runtime and downloads the pinned face-landmarker model, verifying its SHA-256. This needs internet **once**. Afterward the face assets are served from `public/mediapipe/` and `public/models/`. Face processing itself runs on the device and does not call a paid AI API. The large generated vendor asset folders are ignored by Git and prepared automatically in deployment.

```sh
npm test
npm run build
npm run preview
```

`dist/` is the complete deployable frontend, including the face model, runtime, sample photos and icons. A WebGL2 browser uses the GPU renderer. Lower-powered/touch devices use reduced rendering resolution and lighter shadows. If WebGL is unavailable, the software renderer draws the same scene geometry at reduced quality. Face detection can fall back to a centered crop; the editor labels that result. A selfie creates an **approximate stylized face overlay and proportions**, not a photorealistic full 3D reconstruction or identity verification.

## Personalize source defaults

Put your published photos in:

```text
public/photos/photo01.jpg
public/photos/photo02.jpg
public/photos/photo03.jpg
public/photos/photo04.jpg
public/photos/photo05.jpg
public/photos/photo06.jpg
public/photos/photo07.jpg
public/photos/photo08.jpg
```

Edit `src/config/museumConfig.js` for names, appearance, titles, descriptions, dates, favorite/finale IDs and frame placement. Example:

```js
{
  id: 'first-date',
  order: 3,
  file: 'photo03.jpg',
  title: 'Our First Date',
  date: '2026-11-07',
  description: 'One little table, two cups, and a conversation I wanted to keep.',
  position: [5.96, 2.03, -6.4],
  rotation: -90
}
```

Positions are `[x, height, z]` in metres. A rotation of 0 faces +Z, −90 faces −X, 90 faces +X and 180 faces −Z. Use unique IDs. Frame textures retain portrait/landscape aspect ratios; missing images use the local fallback graphic. The editor supports up to 30 memories, but 8–12 frames give the original gallery more breathing room. Adding many frames requires spacing/position adjustments.

Default place, soundtrack and world settings are in `src/data/worlds.js`. Existing local worlds keep their saved values; create a new local world to see changed source defaults.

**Anything committed to a public GitHub repository is public.** For private couple photos, use Together's private upload flow instead of committing them. Local uploads never automatically commit to GitHub.

## GitHub Pages deployment

The existing repository is configured to publish from **gh-pages**, and the included workflow builds every push to **main**, updates the publishing branch and requests a Pages build. It also supports the **GitHub Actions** source setting for new repositories.

```sh
git add .
git commit -m "Personalize our little world"
git push origin main
```

For your own copy:

1. Create a free public GitHub repository named `our-little-museum`.
2. Push the complete project, including `.github/workflows/deploy.yml` and `package-lock.json`.
3. In **Settings → Pages → Source**, choose **GitHub Actions**.
4. In **Actions**, run **Publish museum to GitHub Pages** if the first push ran before Pages was enabled.
5. Wait for the build/deployment to succeed, then open **Settings → Pages → Visit site**.
6. Share the website URL. To share a private world, send the invitation generated inside Together as well.

Vite uses `/our-little-museum/` during GitHub Actions builds and relative paths locally. If you rename the repository, update `vite.config.js`. No paid server is needed.

## Your own Supabase project / administration

Forks should use their own backend rather than the defaults belonging to this site.

1. Create a Supabase project on an available **Free** organization slot. Do not enable a paid plan to follow this guide.
2. Run `supabase/schema.sql` **once in a new empty project** through the SQL editor. It creates private worlds, chat, presence, permissions, rate limits and account recovery storage.
3. Deploy `supabase/functions/couple-account/index.ts` as the `couple-account` Edge Function with JWT verification disabled. Registration/recovery deliberately accept unauthenticated requests; they enforce input validation and a hashed-IP rate limit. The function uses the platform-provided service role credential **only on the server**.
4. Set your project URL and **publishable** API key in `src/config/online.js`, or use `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in a local `.env`. These are public client configuration values. Never put a secret/service-role key in frontend code or a Vite variable.
5. Rebuild and publish. Usernames are mapped internally to synthetic `.invalid` addresses; these are account identifiers, not verified email ownership. Email is not used for authorization or recovery.

The **platform administrator** is the Supabase/GitHub project owner. There is no hard-coded admin password or public admin route. Manage project-level records/accounts through your Supabase dashboard. Individual world owners administer their own partner permissions inside the app.

Free hosting has storage, bandwidth, request and availability limits; free projects may pause when inactive. This is a free-plan deployment, not unlimited free infrastructure. Images are resized before upload; each media upload is limited to 12 MB. Keep backups and monitor Supabase usage. No paid products or subscriptions were enabled. The app deliberately uses membership-protected database heartbeats, so Supabase Realtime need not be enabled.

The recovery/rate-limit tables deny client access by design. Privileged implementations are in a non-exposed schema with explicit authorization checks; public RPC wrappers run as the invoker. Storage and all public tables use RLS. An optional Supabase advisory for leaked-password checking depends on your Auth plan/settings; use a unique, strong password.

## Project structure

| Path | Purpose |
|---|---|
| `src/main.js` | UI, editor, viewer, worlds, accounts, invitations and chat |
| `src/config/` | Sample memories and public backend settings |
| `src/scenes/` | Museum, eight extra environments, camera and rendering |
| `src/characters/` | Procedural avatars and local face alignment |
| `src/controls/` | Keyboard, touch, joystick and collisions |
| `src/components/` | Icons, original synthesized music, avatar preview |
| `src/data/` | Local backups, storage, private uploads and session heartbeat |
| `src/styles/` | Responsive full-screen interface |
| `public/photos/` | Sample photographs and fallback |
| `scripts/prepare-assets.mjs` | Pinned local face-model preparation |
| `supabase/` | Complete database setup and account endpoint |
| `tests/` | Automated environment and collision checks |
| `.github/workflows/deploy.yml` | GitHub Pages build and deployment |

See `QA.md` for verification scope and `LICENSES.md` for asset/library attribution.

## Owner studio update — Jayson & Joana

The default characters are now Jayson and Joana. **Only the world owner edits either character or the shared world.** Partner editing is disabled at the database level. Both accounts retain independent movement, messages, personal controls and activity participation.

1. Open **Manage → Main screen** to edit headings, descriptions, button labels, logo, typography and colors.
2. Choose **Characters** for names, face uploads, garment types, wardrobe presets and location outfits.
3. Use **Save draft** to save privately. Drafts autosave on this device; Save draft additionally stores a cloud draft when connected.
4. Use **Preview**, then **Return to editor**. Choose **Publish changes** to update the shared world. Local worlds use **Publish locally**.
5. In **Together**, create/open a private world, then select **Create partner link**. Copy/share the link, download the QR, or download a designed invitation card. It expires after two days and admits one partner account once. Never post private invitations publicly.
6. Joana opens the invitation with a separate account and accepts it. Both players open the same world. The **World link & QR** is a return link for existing members; it does not grant access.
7. **Messages** includes saved text, letter mode, reactions, photo attachments and voice recording (browser permission required). **Moments** includes interaction invitations, photo timer, notes, bucket-list completion, activities and location/memory QR links.
8. **Manage → Surprises** stores scheduled letters separately. Draft and future letters are withheld from the partner by database policies.
9. **Decorations** offers a draggable top-down placement editor for supported added props. Built-in scenery is not an arbitrary mesh editor. **Places & atmosphere** controls titles, lighting, weather, spawn, camera and local soundtrack.
10. **Backups & history** exports ZIPs and restores earlier publications as drafts. Keep private backups safe. Uploaded media is stored in private Supabase storage, not committed to GitHub.

For a new backend, apply `supabase/schema.sql`, then `supabase/owner-expansion.sql`, then `supabase/realtime-membership.sql`, in that order. The existing connected project has these upgrades applied. The last file rotates the private realtime channel when a partner is removed.

### Honest scope

The avatars are original procedural stylized models inspired by the reference wardrobe; they are not exact reproductions of the reference renders. Clothing presets share tailored base shapes, and selfie uploads provide an approximate stylized likeness. Locations are nine separate scenes, not a seamless streamed continent. Simple paired poses and activities are implemented; advanced cinematic animation, live video calling, arbitrary imported building editing and unlimited free hosting are not included. Mobile layouts are provided, but physical iPhone/Android and two-human-phone testing are still required. Voice recording/playback depends on the browser's supported audio format. No service worker/offline cache is installed.
