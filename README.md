# A little something for you

A responsive, personal scrapbook built with plain HTML, CSS, and JavaScript. The nine views use real elements and the supplied original media: welcome → surprise → six envelopes → six individual letters. No framework, install step, or runtime dependency is required.

## Run locally

With Node.js 18 or newer:

```sh
npm run dev
```

Open **http://localhost:3000**. Stop the server with Ctrl+C. Serve the project over HTTP; opening `index.html` directly as a file will block JavaScript module imports in most browsers.

```sh
npm run check
npm run build
```

The build creates `dist/`, copying only application files and configured assets. Design-reference mockups and unused source art are not deployed. The local server supports byte-range requests so the original videos can seek and load metadata without downloading every video.

## Customize Envelope 06

Edit **`js/content.js`**, in the last object of the **`letters`** array (`id: "06"`). Set:

- `mediaType`: `"image"` or `"video"`.
- `mediaSource`: a relative asset path, such as `"assests/gifts_envelop/my-memory.jpg"`, or an HTTPS URL.
- `mediaAlt`: an accessible description of the attachment.
- `caption`: the handwritten caption below the attachment.
- `messageParagraphs`: an array of strings, one per paragraph.
- `signature`: the sign-off.
- `mascotImage`: optionally, a mascot image path; existing pose paths are in `mascots` in the same file.

`heading` and `label` are also editable. Envelope 06 uses the supplied mirror selfie, `f5360a31-6772-4aa7-b5b2-f869433fe871.jpg`, with a playful personal note and the mascot hugging a letter. It returns to “All envelopes” without an extra goodbye page. You can replace the photo and message here at any time; empty content areas are still omitted automatically.

All five other messages, the two introduction screens, and every personal media/mascot path are also centralized in `js/content.js`. Text is rendered using `textContent`, so quotes and punctuation are safe, and HTML is displayed as text.

## Assets and accessibility

- Original assets remain in the supplied **`assests/`** directory (original spelling preserved). All requested photos, videos, and poses were found; no pose is missing.
- The introduction uses the first frame of **`Mascot sprite sheet with six envelopes-10.png`** because it contains exactly six envelopes. Other poses use the supplied GIFs. Reduced-motion mode uses still frames from the supplied sprite sheets and disables opening/fade effects. Original files are not modified.
- New decorative SVGs are in `assets/`. Layout, paper, gingham, envelope folds, and stitching use CSS. No mockup screenshot is used as the interface.
- Google Fonts supplies Cormorant Garamond, Lora, and Caveat, with local serif/handwriting fallbacks if unavailable.
- Envelopes are native keyboard buttons with visible focus states. Returning to the menu restores focus to the last letter. URL hashes support refresh, deep links, and browser Back/Forward.
- Only the current letter mounts its video, with native controls, `preload="metadata"`, no autoplay, and uncropped proportions. Leaving a letter pauses and unloads its video; hiding the browser tab pauses playback.
- Videos contain user-supplied audio and no supplied caption files. If you add spoken content that needs captions, add a WebVTT `<track>` in the `mediaFrame` function in `js/app.js`.

## Deploy to Vercel later

Import this folder/repository into Vercel, choose **Other** as the framework, and deploy. `vercel.json` already sets:

- Build command: `npm run build`
- Output directory: `dist`

No environment variables or backend are required. Navigation uses hash routes, so no rewrite rules are necessary. Rebuild and redeploy after editing the content file.

Envelope 05 uses **`Screen_Recording_20261114_225131_Roblox.web.mp4`**, a smaller H.264 copy prepared for GitHub and web playback, with the full 2340 × 1080 frame and original audio preserved. The roughly 130 MB original stays unchanged in the local project and is excluded from Git and Vercel uploads. The optimized copy is included in the repository, so Vercel can build it without external media storage or Git LFS. Design mockups, the original brief, and temporary tools are also excluded from uploads.

The GitHub repository is **https://github.com/mink5293/tantan**. After linking it to a Vercel project, pushes to `main` can deploy the updated site automatically.

## Verification

Verified in Chromium: all six envelopes open the mapped content, all three videos play and seek using native controls and pause/unload on exit, Next/Back and browser history work, keyboard focus is restored, and reduced-motion settings use still mascots. All nine views were checked at 320, 390, 540, 768, 1024, and 1440 pixels: no horizontal overflow, clipped text, or undersized touch targets. Header decorations and the page counter were separately checked for overlap. Syntax checks and the production build pass. Physical-device Safari testing was not performed.

## Files

```text
index.html           shared paper shell and metadata
css/styles.css       responsive layout, decoration, and motion
js/content.js        all personal content and asset paths
js/app.js            reusable views, media, navigation, and focus
assets/              decorative SVGs
assests/             supplied references, mascots, photos, videos
scripts/serve.mjs    dependency-free local HTTP/video-range server
scripts/build.mjs    copies the application and configured assets to dist
vercel.json          static deployment configuration
```
