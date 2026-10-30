# IPL Draft Arena

A mobile-first, real-time IPL fantasy draft game for 2–8 friends. Spin for a franchise, pick a player, fill an 11-player batting order plus an Impact Player, trade one-for-one, finalize squad roles, and reveal a playful scorecard.

The server is authoritative for room membership, turns, picks, trades, roles, and evaluation totals. Rooms and games live only in server memory; there are no accounts, database, or match history.

## Requirements

- Node.js 20 or newer
- npm 10 or newer
- A modern browser for each participant
- Optional: a Google Gemini API key for AI-generated evaluation

## Run locally

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in multiple browsers or devices. The API and Socket.IO server listens on port `3001`; its health endpoint is [http://localhost:3001/health](http://localhost:3001/health).

The game works without a Gemini key. To configure one yourself, copy `.env.example` to `.env`, open `.env` in your editor, and paste your key only after `GEMINI_API_KEY=`. Set `GEMINI_MODEL=gemini-2.5-flash` or another model currently enabled for your account. Save the file and restart `npm run dev`. Never send the key in chat, add it to source files, or commit `.env`; `.gitignore` excludes it. The server imports `dotenv/config` in `server/src/index.ts` before loading the evaluation service, and only `server/src/services/evaluationService.ts` reads the key. Vite receives only `VITE_` variables from the root environment file, so `GEMINI_API_KEY` is not bundled for browsers.

To check the no-key path, leave `GEMINI_API_KEY=` blank (or temporarily unset it in the server environment), restart the server, complete a game, and verify that results show “Gemini API key is not configured.” and the labeled backup scorecard. Automated coverage also exercises the fallback evaluator with `npm test`.

To point the client at a server running elsewhere, set `VITE_SERVER_URL` in the root `.env` (or in the hosting provider's frontend environment settings), for example:

```text
VITE_SERVER_URL=http://192.168.1.25:3001
```

For play across a LAN, expose both the Vite client and the server to the network and set `CLIENT_ORIGIN` to the client origin in `.env`. For example, `CLIENT_ORIGIN=http://192.168.1.25:5173`. Do not expose the development server or an unprotected game server to the public internet.

## Useful commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Run Vite and the Socket.IO server together |
| `npm run typecheck` | Type-check client and server TypeScript |
| `npm test` | Run server-side room/draft/trade rule tests |
| `npm run build` | Type-check and create production client/server builds |
| `npm start` | Start the compiled server (after `npm run build`) |

The development server watches server files with `tsx`. The client is built into `client/dist`; the compiled server entry point is `server/dist/server/src/index.js`.

## How to play

1. A host creates a room with a display name and shares the six-digit room code.
2. Friends join with the code and unique display names. Rooms support 2–8 participants.
3. The host starts the draft. The lobby locks, the server randomizes the turn order, and picks continue in strict cyclic order, returning to the first player after the last.
4. On every pick, the active participant spins the server-selected franchise wheel and chooses an available player from that franchise. A confirmation is required before a pick is committed. A depleted franchise can be re-spun without consuming the pick.
5. Each participant drafts 11 main players and one automatically assigned Impact Player.
6. The host opens the trade window. There can be only one pending offer at a time; accepted offers swap ownership atomically. Use the up/down controls or drag a row to change your own batting order.
7. When trades close, each participant selects a captain, a different vice-captain, and a wicketkeeper from their main XI. The host starts evaluation after all participants are ready.
8. The scorecard shows ten category scores out of ten, a server-calculated total out of 100, superlatives, and either a sole or joint draft champion.

Room codes, player sessions, squads, trades, and results are held in memory. A room is deleted when the host closes it, all lobby members leave, the server restarts, or the inactivity timeout expires. A disconnected player keeps their slot; reconnect using the same browser tab/session. After the 45-second grace period, a disconnected host role transfers to a connected participant. If the current drafter disconnects, the host can temporarily act for them; the server does not silently skip a pick.

## Architecture

- `client/`: React, Vite, TypeScript, responsive CSS, and the Socket.IO client.
- `server/`: Express health route, Socket.IO event handlers, room/game engine, and Gemini/fallback evaluation service.
- `shared/`: shared TypeScript contracts and the editable local IPL roster snapshot.
- `server/src/gameEngine.ts`: in-memory room state and server-side validation for all game rules.
- `server/src/services/evaluationService.ts`: server-only Gemini request, response validation, deterministic fallback, and total calculation.

Important Socket.IO actions include `room:create`, `room:join`, `room:resume`, `lobby:start`, `draft:spin`, `draft:spin-again`, `draft:pick`, `trade:propose`, `trade:accept`, `trade:reject`, `trade:cancel`, `trade:close`, `squad:reorder`, `squad:roles:update`, and `evaluation:start`. Clients receive safe full snapshots through `room:state`; credentials and mutable room objects are never sent.

## Roster and evaluation

The player pool is the manually maintained October 30, 2026 roster snapshot in `shared/iplPlayers.ts`, re-exported from `server/src/data/iplPlayers.ts` and detailed in `ipl_current_franchise_rosters_oct_2026.md`. It contains 25 players for each of the ten franchises (250 unique player records), including the four confirmed IPL 2027 trade movements in that snapshot. Update the source document and dataset together as rosters change. Franchise badges are locally rendered monograms with team colors; the game does not depend on third-party logo URLs.

Gemini receives player names, local role metadata, and finalized squad roles from the server. Its response is checked for the exact participant IDs, names, ten criterion keys, score range, and verdict format. Totals are always calculated by server code. If the key is missing or the model times out, errors, or returns invalid data, the deterministic role-based fallback runs and the result page clearly labels the backup scorecard. Evaluation is subjective entertainment, not live form analysis or a prediction of cricket results.

## Environment

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `3001` | Express and Socket.IO port |
| `CLIENT_ORIGIN` | `http://localhost:5173` | Comma-separated allowed browser origins |
| `GEMINI_API_KEY` | unset | Optional server-side Google Gen AI API key |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Configurable Gemini model identifier |
| `ROOM_TTL_MINUTES` | `60` | Inactivity lifetime for in-memory rooms |
| `VITE_SERVER_URL` | `http://localhost:3001` | Public backend URL used by the browser's Socket.IO client |

## GitHub setup and safe first push

The application source folder may not be a Git repository yet. First create an **empty** repository on GitHub while signed in to your own account: choose a repository name (for example `ipl-draft-arena`), choose Public or Private, and do not initialize it with a README, license, or `.gitignore` because this project already contains those files. GitHub account login and any authorization must be completed by you.

From PowerShell in this project folder, inspect the proposed files before staging:

```powershell
git status --short --branch
git status --short --ignored
git check-ignore -v .env
```

`.env` should be reported as ignored. Confirm there is no real key in `.env.example`; it should contain an empty `GEMINI_API_KEY=` and only example/default values. Generated build output and `node_modules` are ignored. If a local `.env` appears under ignored files, keep it ignored and never force-add it.

After confirming the GitHub repository is empty and the inspected files are the ones you want to publish, initialize and make the first commit:

```powershell
git init -b main
git add .
git status --short
git diff --cached --stat
git diff --cached
git commit -m "Build IPL Draft Arena multiplayer game"
```

Review the staged diff for secrets before running `git commit`. Then replace the URL below with the HTTPS or SSH URL displayed by GitHub:

```powershell
git remote add origin https://github.com/YOUR-USERNAME/ipl-draft-arena.git
git push -u origin main
```

If `git remote -v` already shows an `origin`, stop and inspect it rather than replacing it. If GitHub reports that the remote is not empty or has unrelated commits, do not force-push; fetch and reconcile the histories first. GitHub may ask you to sign in or authorize Git from your own terminal.

## Public deployment (Vercel frontend + persistent Node service)

The React/Vite client is a static build, but rooms and Socket.IO broadcasts are held in one Express process's memory. Deploying the backend as a serverless function or using multiple instances would break room sharing. Use one persistent Node web service for the backend and Vercel for the frontend; do not add a database. The included `render.yaml` defines a single-instance Render Starter web service, `npm ci && npm run build:server`, `npm start`, and `/health`. Render's free service may sleep and interrupt games; the Starter service stays available but may incur a charge. Choose the plan intentionally in your Render account.

1. Push the reviewed repository to GitHub as above.
2. In Render, sign in, create a **Blueprint** from that GitHub repository, and review `render.yaml`. Complete `CLIENT_ORIGIN` after the Vercel URL is known. Add your Gemini key directly in Render's environment-variable settings if using AI; set `GEMINI_MODEL` there as needed. Do not put it in `render.yaml`, Vercel, or client source. Render supplies `PORT`; the server binds to it and exposes `/health`.
3. Wait for Render's deploy to complete. Open `https://YOUR-SERVICE.onrender.com/health` and verify JSON with `"status":"ok"`. In the Render service settings, confirm a single instance and WebSocket support (Render web services support WebSockets).
4. In Vercel, import the same GitHub repository. Keep the project root at the repository root; `vercel.json` selects `npm ci`, `npm run build:client`, and `client/dist`. Add the production environment variable `VITE_SERVER_URL=https://YOUR-SERVICE.onrender.com` for the Production environment (and Preview if desired), then deploy. It is a public server URL, not a secret.
5. After Vercel gives you the real frontend URL, set Render's `CLIENT_ORIGIN` to that exact origin, such as `https://your-project.vercel.app` (no path or trailing slash), save it, and redeploy/restart the backend. For a custom domain, include its exact origin too; comma-separated origins are supported.
6. Redeploy the Vercel frontend after setting `VITE_SERVER_URL`. In the deployed server logs, verify it starts and health checks pass. Only claim deployment is successful after both health and browser Socket.IO tests below succeed.

For production, configure `GEMINI_API_KEY` and `GEMINI_MODEL` only in the backend provider's secret/environment settings. To test without a key, leave it unset in Render; evaluation automatically uses the labeled deterministic fallback and no key is required for play.

## Two-device live test

After both deployments are healthy:

1. Open the Vercel URL on your laptop. Confirm the room connection is live, create a room, and note the six-digit code.
2. Open that same URL on a mobile phone using a separate browser/device and join with the code and a different display name.
3. Confirm both lobby lists show two connected players. The host should be able to start; the guest should see the waiting state. Start the draft on the laptop.
4. Check that both devices show the same turn order, active drafter, and wheel result. The non-active player must not be able to spin. The active player selects a player from the spun franchise and confirms; both screens should mark that player unavailable and show the same squad update.
5. Continue several picks and confirm turn progression. Complete a full draft when practical, then test one trade acceptance/rejection, a batting-order change, role finalization, and fallback or Gemini evaluation.
6. Watch the browser console and Network panel for failed Socket.IO requests, and Render logs for server exceptions/restarts. Confirm the app's LIVE/RECONNECTING status and inspect the mobile page at 320–430px with no horizontal scrolling.
7. If a check fails, record the browser console message, request failure, corresponding Render log, and test step; never include API keys in the report. An in-memory room is lost if the backend restarts, so do not restart Render during a match.

## Known limitations

- This is a private-friends game, not an authenticated or hardened public service. Player IDs are temporary session capabilities.
- State is single-process and in-memory. Restarting the server clears all rooms; multiple server instances are not coordinated.
- The manually maintained roster snapshot can become stale and is not an official squad list or live cricket feed.
- The fallback evaluator uses simple role-count heuristics and is not a professional ranking.
- No historical matches, accounts, chat, or persistent player statistics are stored.

## Manual acceptance checklist

Run `npm run dev` and use separate browser profiles/devices. Verify:

### Rooms and lobby

- [ ] Create a room and confirm it displays a six-digit code; copy/share the invite.
- [ ] Join from another browser and confirm both lobby player lists update live.
- [ ] Confirm the host cannot start with one player and can start with 2–8 players.
- [ ] Confirm duplicate names, invalid codes, a ninth player, and joining after draft start are rejected with a visible message.
- [ ] Disconnect/reconnect a participant and confirm the slot/status is retained.

### Draft

- [ ] Confirm the randomized order is shared and cycles in the same order across multiple rounds for 2–8 players.
- [ ] Confirm only the active participant can spin and all clients see the same server-selected franchise.
- [ ] Confirm a pick must match the selected franchise and requires confirmation.
- [ ] Confirm picks immediately become unavailable to everyone and cannot be duplicated.
- [ ] Confirm a depleted franchise allows a re-spin without advancing the pick.
- [ ] Complete a draft and verify each squad has 11 main players plus a separate Impact Player.

### Trades and squad roles

- [ ] Open the trade window as host; confirm non-host controls cannot open/close it.
- [ ] Propose a trade and confirm only the target player's owner can accept/reject.
- [ ] Confirm the proposer can cancel, only one offer can be open, and accepted swaps update both squads without changing squad sizes.
- [ ] Confirm the host cannot close with a pending trade.
- [ ] Reorder your own batting lineup using drag-and-drop and the accessible move buttons; verify other clients see it.
- [ ] Close trades, select captain, vice-captain, and wicketkeeper from the main 11, and verify captain/vice-captain must differ.
- [ ] Confirm the host cannot evaluate until every participant has finalized roles.

### Evaluation, responsiveness, and recovery

- [ ] Without a Gemini key, finish a game and confirm the labeled fallback scorecard shows ten scores and a server-calculated total out of 100.
- [ ] With a valid Gemini key, confirm valid AI scorecards appear; simulate unavailable/invalid API output and confirm fallback results still complete.
- [ ] Confirm equal totals show joint champions and “Results are for fun”.
- [ ] Verify keyboard focus and reduced-motion behavior. Inspect at viewport widths 320, 375, 430, 768, 1024, and 1440 pixels; confirm no horizontal page overflow and tap-friendly controls.
- [ ] Confirm a fresh room can be created from the results screen and that the host can close the room.

Automated server-rule coverage is in `server/src/gameEngine.test.ts`.
