# Love New Tab — for Mena ♥

A romantic **New Tab** dashboard. Every new tab opens to a big clock, a countdown
to the next time you two are together, a reason for today, a little quote, your
own quick-link tiles, and a gentle starfield. Part of the **Love for Mena**
collection.

Works in **Chrome, Edge, Brave and Firefox** (Manifest V3). No build step, no
dependencies, no network requests — everything you set stays in the browser.

## What it does

- **Big clock + date** (12- or 24-hour) and a greeting with her name
- **Reunion countdown** — editable date and label, in days/hours
- **A reason for today** — 40 bundled reasons, chosen deterministically by date
- **A little quote** — 24 bundled quotes, with an "Another one" shuffle
- **Editable quick links** — up to 12 tiles, with a coloured initial badge
- **Starfield** background (respects `prefers-reduced-motion`)
- **Settings** in the toolbar popup or the options page
- Only the `storage` permission is requested

## Install (load unpacked)

The repo ships **two** manifests so one codebase covers both browsers. Copy the
right one to `manifest.json` first — it is intentionally not committed.

### Chrome / Edge / Brave

1. Copy the Chrome manifest:
   ```powershell
   Copy-Item manifest.chrome.json manifest.json
   ```
2. Open `chrome://extensions` (or `edge://extensions`).
3. Turn on **Developer mode** (top-right).
4. Click **Load unpacked** and pick this project folder.
5. Open a new tab — it should be the Love New Tab. 🎉

### Firefox

1. Copy the Firefox manifest:
   ```powershell
   Copy-Item manifest.firefox.json manifest.json
   ```
2. Open `about:debugging#/runtime/this-firefox`.
3. Click **Load Temporary Add-on…** and pick `manifest.json` inside this folder.
4. Open a new tab. (Temporary add-ons are removed when Firefox closes — reload the
   same way, or sign the extension with `web-ext` / AMO for a permanent install.)

### Set it up

Click the toolbar icon (or the **Settings** link on the New Tab) and set your
names, the date you next meet, the words under the countdown, and your quick links.

## How it works

`src/common/api.js` sets `const api = globalThis.browser || globalThis.chrome;`
and every other script uses `api.*`. All the real logic is in pure functions
exposed on `globalThis.MenaNewTab`, so it can be tested without a browser.
Settings are stored via `api.storage.local` under `mena-newtab`:

```json
{
  "you": "Mena", "me": "Ammar",
  "reunionDate": "2026-12-25", "reunionLabel": "until we're together again",
  "links": [{ "id": "l1", "title": "Our little universe", "url": "https://…" }],
  "showReason": true, "showQuote": true, "showStarfield": true, "clock24": true
}
```

The "reason for today" is just `reasons[dayNumber(now) % reasons.length]`, so it is
the same all day and changes at local midnight.

## Files

```
manifest.chrome.json     MV3, background.service_worker
manifest.firefox.json    MV3, background.scripts + gecko id
src/background.js        tiny: records an "installed" marker
src/common/api.js        api = browser || chrome
src/common/theme.css     shared love-theme (copied from _love-theme/)
src/common/data.js       bundled reasons + quotes
src/newtab/              the New Tab page (html/css/js) + starfield
src/popup/               settings (used as popup and options page)
icons/                   icon-16/32/48/128.png + icon.svg
tools/make-icons.js      regenerates the icons (no image tools needed)
test/harness.js          dependency-free Node harness
```

## Tests

```powershell
node --check src/newtab/newtab.js
node test/harness.js
```

The harness runs the extension scripts in a fake-DOM sandbox with a mocked
`api.*` and checks the pure logic, the bundled content and both manifests.

## Regenerate the icons

```powershell
node tools/make-icons.js
```

## License

Creative Commons BY-NC-ND 4.0 — see [`LICENSE`](LICENSE).
© 2026 Ammar (MenaAmmarPro). Made with care for Mena.
