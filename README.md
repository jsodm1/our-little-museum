# Our Little Museum

A walkable Three.js photograph museum for two. A companion follows the visitor through a warm gallery with eight framed memories, a favorite-photo wall and a final letter. All images, character geometry and sound are local to the app.

[Open the museum on GitHub Pages](https://jsodm1.github.io/our-little-museum/)

## Run on your computer

1. Install Node.js 22.12 or newer and Git.
2. On GitHub, choose **Code → Download ZIP** and extract it, or run the commands below.
3. Open a terminal in the folder containing **package.json**.

```sh
git clone https://github.com/jsodm1/our-little-museum.git
cd our-little-museum
npm install
npm run dev
```

If you downloaded the ZIP, skip the first two commands and open the extracted project folder. Open the **Local** address printed by Vite. Keep the terminal open. To test a phone, connect it to the same Wi-Fi as the computer and open Vite's **Network** address in Safari or Chrome. Allow the development server on your private network if your firewall asks. Press Ctrl+C to stop.

## Make it yours

**Photographs.** Replace the eight JPEG files inside **public/photos/**, keeping the names **photo01.jpg** through **photo08.jpg**. Portrait and landscape images fit inside both their museum mats and the large viewer without stretching or cropping. The small collection thumbnails use a cropped preview. JPEG or WebP at about 1,200–2,000 pixels on the longest side is a practical starting point. Convert iPhone HEIC images to JPEG first.

**Names and appearance.** Open **src/config/museumConfig.js**. Under **couple**, change each **name**. The names appear over the characters, at the entrance and on the memory wall. Edit **hair**, **skin**, **top**, **pants** and **shoes** using hex colors. Choose **short**, **long** or **bob** for **hairStyle**. The first character is the visitor, and the second follows.

**Titles, captions and dates.** Edit the corresponding object under **memories**. Dates use YYYY-MM-DD. Change **order** to rearrange the index and the viewer's Next/Previous sequence. Change **favoriteId** and **finaleId** to select the special frames. Edit **personalMessage** for the letter shown inside the final memory. Keep the two IDs different. Each memory needs a unique **id**.

**Add a photograph.** Save your next image as **public/photos/photo09.jpg**. Add another object inside **memories**, separated by a comma. The following position fits beside the final frame:

```js
{
  id: 'a-rainy-afternoon',
  order: 9,
  file: 'photo09.jpg',
  title: 'A Rainy Afternoon',
  date: '2026-10-18',
  description: 'We missed the bus and spent an hour watching the rain together.',
  position: [-3.7, 2.03, 9.96],
  rotation: 180
}
```

| Wall | Fixed coordinate | Rotation | Change this to space frames |
| --- | --- | --- | --- |
| Far wall | z = -9.96 | 0 | x |
| Entrance wall | z = 9.96 | 180 | x |
| Left wall | x = -5.96 | 90 | z |
| Right wall | x = 5.96 | -90 | z |

Coordinates are **[x, y, z]** in metres. Positive y is up. Leave roughly 2.8 metres between ordinary landscape frame centers and extra space around a special frame. Missing files show an illustrated placeholder.

Personal edits appear on the public site after you commit the assets and configuration and the Pages workflow succeeds. Anyone who can access the public repository can also download its photographs.

## Visit and test

| Action | Computer | Phone or tablet |
| --- | --- | --- |
| Enter | Start Exploring | Start Exploring |
| Walk | WASD or arrow keys | Left joystick |
| Look and zoom | Drag, then scroll to zoom | Drag, then pinch to zoom |
| Open a photo | Click a frame or press E when its title appears | Tap the frame or nearby title |
| Browse or close | Previous / Next, left / right arrows, Esc | Previous / Next / Close |
| Stand together | Heart button | Heart button |
| Return to the entrance | Circular arrow | Circular arrow |

Use **Memory index** to go directly to any photograph. **Guide** explains the controls during a visit. **Sound** enables an original synthesized ambient chord and gentle notes after a tap. Fullscreen appears when the browser supports it.

For a production check:

```sh
npm run build
npm run preview
```

Open the printed address. Try walking against each wall and the bench, dragging the camera, clicking a frame, browsing all eight images and closing the viewer. Open **Forever With You** to check the final letter. Test both orientations on a phone. To check the missing-image fallback, temporarily rename one JPEG and reload, then restore it. The production files are in **dist/** and need an HTTP server.

## Publish with GitHub Pages

This repository includes **.github/workflows/deploy.yml**. Its GitHub build uses **/our-little-museum/** as the Vite base. A local build uses relative paths.

1. For a new copy, create a free public GitHub repository called **our-little-museum**.
2. In **Settings → Pages → Build and deployment → Source**, select **GitHub Actions**.
3. For a cloned project, publish edits by running:

   ```sh
   git add .
   git commit -m "Personalize the museum"
   git push origin main
   ```

   For an extracted project you want to publish to a **new empty repository**, open a terminal in its folder and run:

   ```sh
   git init -b main
   git add .
   git commit -m "Create our little museum"
   git remote add origin https://github.com/YOUR-USERNAME/our-little-museum.git
   git push -u origin main
   ```

   Replace YOUR-USERNAME with your GitHub username. If the target already has a README or other commits, clone it first, copy the project files into the clone and use the first set of commands. Include the hidden **.github** folder.
4. Open **Actions → Publish museum to GitHub Pages**. Every push to main runs a clean install, builds the site and deploys **dist/**. Use **Run workflow** after changing Pages settings if necessary.
5. Once the run is green, open **Settings → Pages → Visit site**. Share that address. For this repository it is **https://jsodm1.github.io/our-little-museum/**.

If you change the repository name, update the GitHub Actions base in **vite.config.js**. If Pages reports a setup error, check the publishing source and rerun the workflow. To check a missing photo, compare the exact filename, its capitalization and its extension with the configuration.

## Source map

| Location | Purpose |
| --- | --- |
| src/main.js | Entrance, visitor guide, collection index, sound controls and viewer |
| src/config/museumConfig.js | All editable memories, names, styles and final letter |
| src/scenes/ | Gallery architecture, lighting, textures, camera and compatibility rendering |
| src/characters/ | Original jointed character meshes and walking, breathing and reaching poses |
| src/controls/ | Keyboard, touch, pointer input and collision boundaries |
| src/components/ | Interface icons and Web Audio ambience |
| src/styles/ | Responsive layouts and reduced-motion styles |
| public/photos/ | Replaceable JPEGs and missing-image artwork |

Modern WebGL2 browsers use the full Three.js renderer. Touch devices use a capped pixel ratio and lighter shadows. When a browser denies WebGL, a lower-resolution software renderer draws the same 3D geometry and keeps the walk and frame interactions. If graphics initialization fails entirely, the photo index and viewer remain available.

The eight sample photographs depict a fictional couple and were generated for this project. The names, dates and captions are editable examples. The meshes, icons, ambience and fallback illustration were created for the museum. Third-party libraries retain their package licenses.
