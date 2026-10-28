# Rhm_First_Repository

## Orbit Pop

Orbit Pop is a browser-based bubble shooter with 50 stages, colorful Canvas graphics, and progress saved in your browser. It uses plain HTML, CSS, and JavaScript and needs no install, account, server backend, or API key.

## Play in GitHub Codespaces

1. Open a terminal in your Codespace.
2. Run `npm run serve`.
3. Open the forwarded port 4173 in the Ports tab (Codespaces usually offers an Open in Browser link).

Alternatively, open `index.html` through a local static web server. Browser modules generally cannot be run reliably from a `file://` URL.

## Controls

- Aim with your mouse or finger and click/tap the board to shoot.
- Use the Shoot button, Space, or Enter to fire.
- Use the left and right arrow keys to aim when the board is focused.
- Use Swap to exchange the current and next bubbles. Pause is in the upper-right of the game.
- Match three or more same-color bubbles. Bubbles no longer connected to the ceiling drop too.
- Reach the stage's clear target before shots run out. Clear enough bubbles to earn up to three stars.
- Bomb, rainbow, line-clear, frozen, and stone bubbles appear in later stages. Their symbols and the stage note explain the current special rules.

## Project map

- `index.html` contains the accessible page structure and screens.
- `styles.css` contains the responsive layout and visual design.
- `mobile-controls.css` keeps the touch bubble tray and swap button usable on narrow screens.
- `js/main.js` connects the game, Canvas drawing, input, and screens.
- `js/engine.js` contains grid placement, matching, special effects, and floating-bubble checks.
- `js/levels.js` defines the 50 stages and their progression.
- `js/storage.js` saves progress and settings, with an in-memory fallback if browser storage is unavailable.
- `js/audio.js` synthesizes short sound effects using Web Audio.
- `tests/engine.test.js` checks core game rules and level data.
- `tools/serve.mjs` is a tiny local static server for Codespaces.

## Tests and development

Run the automated engine checks with `npm test`. No package installation is needed. Serve the game with `npm run serve`, then use the browser to test mouse, touch, keyboard, pause, restart, stage selection, and saved progress. The server listens on port 4173.

## Publish with GitHub Pages

1. Push this repository to GitHub.
2. In the repository, open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, select `main` and `/ (root)`, then save.
4. Wait for the deployment link to appear in the Pages section. The game is static files, so it needs no build workflow or backend.

## Notes and future improvements

All game state stays on the current browser and device; clearing site data resets it. Web Audio starts after a player interacts with the game, and audio or storage can be unavailable in restrictive browser contexts. Levels are designed data-driven patterns with progressive constraints; automated tests validate the level count and core grid rules, but this is not a professionally playtested difficulty curve. A future pass could add cross-device saves, more hand-tuned stage layouts, and optional original background music.
