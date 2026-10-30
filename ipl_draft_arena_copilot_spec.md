# IPL Draft Arena --- Product Requirements & Copilot Build Specification

**Purpose:** Build a fun, real-time, mobile-first multiplayer web game
where 2--8 friends draft IPL players into fantasy squads, trade players,
arrange batting order, assign roles, and get a dramatic AI-generated
squad evaluation.

**Audience:** GitHub Copilot working in a new VS Code folder. Treat this
document as the single source of truth. Implement the app end-to-end,
including responsive UI, real-time room state, validation, error
handling, and a usable local development setup.

------------------------------------------------------------------------

## 1. Product principles

-   Keep the project deliberately small and easy to run. Maximum eight
    human players per room.
-   No user accounts, no database, no persistent match history, no
    payments, and no elaborate scalable architecture.
-   Every participant uses their own device and sees shared state update
    in real time.
-   A room exists only for the current game. It may disappear when the
    host closes it, the server restarts, or the room expires.
-   Never trust the browser alone for game rules. The server is
    authoritative for room membership, turns, player ownership, trades,
    and phase transitions.
-   Prioritize a polished, playful, cricket-themed experience over
    unnecessary complexity.
-   Mobile-first, touch-friendly, and responsive from small phones to
    large desktop displays.
-   Use only a single game state in memory on the server. No database is
    needed.
-   Use the Gemini API only for the final evaluation. The core game must
    remain playable if the AI API is unavailable.

## 2. Game summary

A host creates a room and receives a unique six-digit room code. Friends
join by entering the code and a display name. The lobby shows all joined
players and the host can start with any number from 2 to 8 players.

When the game starts, the room is locked against new joins. Players take
turns spinning a wheel containing the logos of all ten current IPL
franchises. The wheel selects a franchise; the active player then
chooses one available player from that franchise's visible player list.
After confirmation, that player is added to the active player's squad
and marked unavailable to everyone else. Turns continue until every
participant has a 12-player squad: 11 main squad players plus one
designated Impact Player.

After the draft, the host opens a trade window. Players can offer one of
their own squad players for another player's squad player. Only one
trade proposal can be active globally at a time. The proposal's owner
can accept or reject it. Once the trade window closes, the host advances
to squad evaluation. The AI evaluates all squads on ten criteria, each
out of ten, and announces results in a fun, dramatic presentation.

## 3. Recommended stack

Use a straightforward TypeScript full-stack setup:

-   **Frontend:** React + Vite + TypeScript.
-   **Styling:** Tailwind CSS (or CSS modules if Tailwind setup becomes
    a blocker). Prefer Tailwind for speed and consistency.
-   **Real-time communication:** Node.js + Express + Socket.IO.
-   **Shared types:** TypeScript types/interfaces shared between client
    and server if practical.
-   **AI evaluation:** Google Gemini API through the official current
    Google Gen AI SDK for Node.js, called only from the server.
-   **Development:** npm scripts for client and server; one clear
    command to run both concurrently.
-   **Testing:** lightweight unit tests for critical game rules if time
    permits, plus a manual test checklist in the README.
-   **Data:** all rooms and game state in server memory. No database,
    ORM, authentication, or cloud deployment requirement.

Use compatible, currently supported package versions. Do not hard-code
an obsolete Gemini model name. Make the model configurable via
`GEMINI_MODEL` in the server environment; default to a currently
available Flash model and document how to change it.

Suggested layout:

``` text
ipl-draft-arena/
  README.md
  .gitignore
  .env.example
  package.json
  client/
    index.html
    src/
      app/
      components/
      pages/
      hooks/
      lib/
      styles/
      types/
  server/
    src/
      index.ts
      socket.ts
      roomManager.ts
      gameEngine.ts
      data/
        iplPlayers.ts
      services/
        evaluationService.ts
      types/
  shared/
    types.ts
```

The exact structure may vary, but keep responsibilities separated and
avoid putting all logic in one giant component.

## 4. Core screens and user journey

### 4.1 Home screen

Show: - Game title: **IPL Draft Arena** (name can be changed easily). -
Short tagline such as "Spin. Pick. Trade. Build a champion." - Primary
actions: **Create Room** and **Join Room**. - A short explanation: 2--8
players, one device per player, live multiplayer. - Visual style: bold
cricket energy, dark stadium background, bright accent colors,
team-color touches, clean typography, subtle motion.

Create Room asks for a display name. On success, create the room and
take the host to the lobby.

Join Room asks for: - Six-digit room code. - Display name. - Clear
validation and friendly error messages.

### 4.2 Lobby

Display: - Six-digit room code in large, copyable text. - Copy/share
action that copies a concise invite message, e.g. "Join my IPL Draft
Arena room: 123456". - Player list with host indicator and live player
count (`3 / 8`). - Live updates when people join or leave. - Host-only
**Start Draft** button. - Non-hosts see a waiting state. - Host may
start only when 2--8 players are present. - The host can start with any
number of joined players from 2 through 8; do not require exactly
eight. - If the host leaves before starting, either transfer host to the
earliest remaining participant or close the room if no one remains.
Prefer host transfer. - Once the draft starts, the room is locked;
reject all new join attempts with a message that the game is already in
progress.

Display a clear confirmation before starting because starting locks the
lobby.

### 4.3 Draft screen

The main game screen must show: - Current phase and round/pick
progress. - Whose turn it is, with a strong visual highlight. - A
prominent spin wheel containing all ten IPL franchise
identities/logos. - Current player's name and squad. - All players'
squads, accessible without hiding the main interaction. On mobile, use
tabs or a horizontally scrollable player strip; avoid cramming eight
full squads into one narrow screen. - A searchable/filterable player
pool, grouped by franchise. - Clear availability state for every player:
**Available** or **PICKED by \[player\]**. - Recent pick/event feed. -
Connection status if a participant disconnects. - A clear disabled state
for actions when it is not the local player's turn.

Only the current active player may spin the wheel. Other players see the
same wheel animation and final result in real time. The server
determines the winning franchise; do not let each browser randomly
select its own result.

#### Wheel behavior

-   Wheel segments represent all ten current IPL franchises.
-   Each segment should be visually distinguishable using team color and
    logo/monogram.
-   If official logos are not available or their use is uncertain, use
    local text/monogram badges with team colors, while keeping the logo
    asset easy to replace. Do not make the game dependent on remote
    image URLs.
-   When the active player spins, animate the wheel on all clients
    toward the server-selected franchise.
-   Prevent duplicate spin requests while a spin is in progress.
-   Once the result is revealed, the active player must choose an
    available player belonging to that franchise.
-   If the selected franchise has no available players, show an explicit
    "No players left from this franchise" state and provide a **Spin
    Again** action for the active player. This does not consume the
    pick. Enforce this on the server.
-   If there are available players from the franchise, the player must
    select one of those players.
-   On selection, show a confirmation modal with player name, franchise,
    and **Confirm Pick** / **Cancel**.
-   Only after server confirmation is the player assigned and marked
    picked for all clients.
-   The next turn begins only after a successful pick is committed.

#### Draft order and completion

-   Establish a random turn order when the host starts the draft, then
    show it to everyone.
-   Use a simple snake draft to distribute picks fairly: for each round,
    traverse the player order forward, then reverse it for the next
    round. The wheel spin occurs on every pick.
-   Each participant receives exactly 12 players. The total picks
    required are `playerCount × 12`.
-   Clearly label the 12th slot as **Impact Player**. The first 11 are
    the main squad.
-   To keep this simple, each participant's first 11 confirmed picks
    fill the main squad, and their 12th pick fills the Impact Player
    slot. The player should not manually choose the Impact Player during
    drafting.
-   Do not end the draft until every player has 12 players.
-   Ensure there are enough unique player records in the player pool for
    the maximum 96 total picks. If the pool is exhausted, show a clear
    error and do not corrupt the state. Seed a sufficiently large pool.

### 4.4 Player pool and data

Maintain a local, typed player data file. Do not depend on a live
external cricket API for the core game.

Each player record should include: - Stable unique `id`. - `name`. -
`franchiseId`. - Optional `role` (batter, wicketkeeper-batter,
all-rounder, bowler). - Optional `nationality` and short tags if useful.

Seed the data with a sufficiently large set of recognizable IPL players
across all ten franchises. Keep the list easy to update. Prefer current
franchise affiliations, but clearly document that the roster is a
manually maintained snapshot and can be updated in the data file. Avoid
duplicate player IDs. Ensure no player is assigned to more than one
franchise in the seed data.

Suggested franchise IDs and display names (keep data configurable): -
CSK --- Chennai Super Kings - DC --- Delhi Capitals - GT --- Gujarat
Titans - KKR --- Kolkata Knight Riders - LSG --- Lucknow Super Giants -
MI --- Mumbai Indians - PBKS --- Punjab Kings - RR --- Rajasthan
Royals - RCB --- Royal Challengers Bengaluru - SRH --- Sunrisers
Hyderabad

Do not fabricate "official" logos. Store local logo files if
licensed/available; otherwise create polished CSS/monogram placeholders.

### 4.5 Trade window

After the draft finishes: - Automatically move the room into a **Draft
Complete** interstitial. - The host gets a **Open Trade Window** button.
Only the host can move from draft completion to the trade phase. -
Everyone can inspect all squads and select players in their own squad. -
A **Propose Trade** button appears only during the trade phase and only
when the local user selects one of their own players. - A player may
propose to trade one of their own squad players for one player belonging
to another participant. - Only one trade may be open across the whole
room at a time. - When a trade is proposed, show it prominently to all
participants, including: - Proposer and their offered player. - Target
player and that player's owner. - Clear **Accept** and **Reject**
controls for the target player's owner only. - Everyone else can view
the pending offer but cannot accept/reject it. - A trade is an exact
one-for-one swap between two players' existing squads. The two players
remain in their respective squads after the swap. - Validate on the
server that both players still belong to the expected owners, neither
player has changed ownership, the proposer owns the offered player, and
the target owner is not the proposer. - If accepted, atomically swap
ownership and update both squads for every client. - If rejected, close
the trade with a clear notification. - The proposer may cancel a pending
offer before it is accepted/rejected. - While a trade is pending, no one
can initiate another trade. - A trade ends when accepted, rejected, or
cancelled. After it ends, another proposal may be created. - No player
can be traded out of a squad they do not own. - Keep the 12-player squad
size invariant during every trade. - Allow multiple trades sequentially
until the host closes the window. - The host can **Close Trade Window &
Finalize Squads**. Once closed, trades are disabled and the host can
continue to evaluation. - If no trade is desired, the host can close the
trade window immediately. - If a trade is pending, require it to be
resolved or cancelled before the host can close the trade window.

### 4.6 Squad management and batting order

Each participant should be able to arrange their own 11 main squad
players in batting order: - Drag-and-drop should work with mouse and
touch. A dedicated drag-and-drop library is acceptable if it behaves
reliably on mobile. - Also provide accessible **Move up** and **Move
down** buttons as a fallback, so reordering does not depend on drag
gestures. - The Impact Player is a separate 12th slot and is not part of
the 1--11 batting order. - Only the squad owner can reorder their
squad. - The order updates live for all players. - Persist the order
only in the in-memory room state. - Trades should preserve each team's
existing order as much as possible; if a swapped player occupies a
batting-order slot, replace that slot with the incoming player. The
Impact Player slot stays the Impact Player slot when trading an Impact
Player.

### 4.7 Squad roles

Once the trade window is closed, every participant must finalize: -
Captain --- one of their 11 main squad players. - Vice-captain --- a
different player from their 11 main squad players. - Wicketkeeper ---
one of their 11 main squad players. - Impact Player --- their 12th
drafted player, shown in a separate slot.

Captain, vice-captain, and wicketkeeper must be selected from the main
11, not the Impact Player. They may overlap with each other except
captain and vice-captain must be different. The wicketkeeper can also be
captain or vice-captain if the user chooses.

Show a completion checklist for each participant's own squad. A
participant must complete all required selections before evaluation can
begin. Other participants can see finalized role assignments live.

### 4.8 Evaluation phase

After trades close: - Show a squad-finalization screen with each
participant's 11-player batting order, Impact Player, captain,
vice-captain, and wicketkeeper. - The host sees **Go for Evaluation**. -
The host can trigger evaluation only after every participant has
completed role selection. - Show an exciting evaluation loading state
with rotating cricket-themed messages. Do not make it look like a
generic spinner. - The server calls Gemini using a structured prompt and
requests valid JSON. - AI evaluation is advisory/entertainment-oriented,
not a guarantee of real cricket outcomes. - Evaluate every squad on the
same ten criteria, each scored from 0 to 10: 1. Top-order batting 2.
Middle-order batting 3. Finishing ability 4. All-rounders 5. Spin
bowling 6. Powerplay bowling 7. Death bowling 8. Athleticism / fielding
9. Leadership and experience 10. Team balance and role clarity - Overall
score is the sum of all ten category scores, from 0 to 100. Calculate
the total in server code; do not trust an AI-provided total. - The model
must evaluate only based on the player names/known player profiles
provided in the request. Do not let it invent players or change
squads. - Use structured output / JSON parsing if supported by the
chosen SDK. Validate every field, criterion name, and score range before
accepting the response. - If the AI call fails, times out, returns
malformed data, or a quota is reached, use a deterministic fallback
evaluation with the same ten categories and a clear "AI unavailable ---
using backup scorecard" note. The game must still finish. - Avoid
sending API keys to the browser. The server owns the Gemini call. - Add
a short timeout and handle errors gracefully. Prevent duplicate
simultaneous evaluation requests. - Store the evaluation in room memory
so every client sees the same results.

### 4.9 Results screen --- make it fun

This should feel like a mini cricket awards night: - Dramatic reveal
with stadium-style background, celebratory animation, and a brief sound
effect only if sound is user-enabled. Respect reduced-motion
preferences. - Show champion squad first with a clear **Draft
Champions** / **Best Squad on Paper** title, but avoid claiming the
score predicts actual match results. - Show each team's total score out
of 100 and a breakdown of all ten categories. - Show category-specific
superlatives such as: - "Powerplay Monsters" - "Death-Over Demons" -
"Spin Wizards" - "Finishing School" - "Fielding Fireworks" - "Captaincy
Material" - "Most Balanced XI" - Generate a short, playful AI commentary
line per team if available, but fall back to static templates. - Add a
"Results are for fun" note. - If scores tie, show a tie; do not invent
an arbitrary winner. The result can say "Joint Draft Champions". -
Provide **Play Again / Create New Room** to return to the home screen.
No past match history is required. - The host can close the room. The
room should also be cleaned up after all players leave or after a
configurable inactivity timeout.

## 5. Real-time architecture and room state

Use Socket.IO events with server-side validation. Keep event names
consistent and document them in code.

Suggested events (names may be refined): - Client → server: -
`room:create` - `room:join` - `room:leave` - `lobby:start` -
`draft:spin` - `draft:pick` - `trade:propose` - `trade:accept` -
`trade:reject` - `trade:cancel` - `trade:close` - `squad:reorder` -
`squad:roles:update` - `evaluation:start` - `room:close` - Server →
clients: - `room:created` - `room:joined` - `room:error` -
`room:state` - `lobby:updated` - `draft:spin-result` -
`draft:pick-confirmed` - `trade:updated` - `squad:updated` -
`evaluation:progress` - `evaluation:complete` - `room:closed`

A server-to-client full `room:state` snapshot after important
transitions is acceptable and simpler than maintaining many fragile
partial updates. Do not send secrets such as API keys. Do not expose
internal mutable objects; create safe serialized snapshots.

Suggested in-memory room shape:

``` ts
type GamePhase =
  | "lobby"
  | "draft"
  | "draftComplete"
  | "trade"
  | "finalize"
  | "evaluating"
  | "results";

interface Room {
  code: string;
  hostPlayerId: string;
  phase: GamePhase;
  players: PlayerSession[];
  turnOrder: string[];
  currentTurnIndex: number;
  currentSpinFranchiseId?: string;
  spinInProgress: boolean;
  squads: Record<string, Squad>;
  pickedPlayerIds: string[];
  pendingTrade?: TradeOffer;
  evaluation?: EvaluationResult;
  createdAt: number;
  lastActivityAt: number;
}
```

Adapt types as needed. Use a stable server-generated player/session ID
stored in that browser tab's session storage so a refresh can reconnect
to the same room during the current session. This is temporary session
continuity, not account authentication. Treat the session ID as a
capability and validate it against the room state. Do not store
persistent match history. If session storage is unavailable, allow
joining again with a new session after the old one disconnects or
expires.

### Room codes and membership

-   Generate a random, unique six-digit numeric code, including leading
    zeros if needed.
-   Ensure the code is not already in active in-memory rooms; retry on
    collision.
-   Reject invalid codes and duplicate display names within the same
    room (case-insensitive).
-   Trim names, limit their length (e.g. 2--18 characters), and reject
    empty names.
-   Enforce the eight-player maximum on the server.
-   A client cannot change another player's name, squad, role
    assignments, or batting order.
-   Rate-limit or guard repeated spin/pick/trade/evaluation actions
    enough to prevent accidental spam. No heavyweight anti-abuse service
    is needed.
-   When a participant disconnects, keep their slot temporarily so they
    can reconnect. Mark them disconnected in the UI. Use a short
    reconnection grace period; if they do not return, allow the host to
    continue only where doing so will not break turn or squad
    invariants. Keep behavior simple and documented.
-   Do not let the host start with fewer than two players or more than
    eight.

### Game rules enforced on server

The server must verify every action: - Only host can start the draft or
change phases. - No joining after the draft starts. - Only active player
can spin or make the current pick. - A pick must belong to the franchise
returned by the current spin. - A player can be picked only once
globally. - The next turn cannot advance until a valid pick is
committed. - Each participant receives exactly 12 unique players. -
Trades are only allowed in the trade phase, with one pending offer at a
time. - Only the target player's owner can accept/reject a trade. - Only
the proposer can cancel their own pending offer. - Only squad owner can
reorder or edit their roles. - Role selections must refer to valid
players in the correct squad and phase. - Evaluation only starts after
trade phase has closed and every player finalized roles. - Duplicate
requests should be idempotent where practical or rejected safely. - The
server computes totals and determines ties.

## 6. UI/UX requirements

### Visual direction

-   Modern IPL/stadium atmosphere: deep navy/charcoal base, floodlight
    glow, energetic orange/gold accents, subtle gradients, team colors
    as accents.
-   Make the interface feel like a fun party game, not a corporate
    dashboard.
-   Use motion for wheel spins, picks, trade confirmations, and results
    reveal, but keep it smooth and lightweight.
-   Use accessible contrast and readable font sizes.
-   Use clear icons and labels; do not rely on color alone to convey
    ownership or availability.

### Responsive behavior

-   Design mobile-first at 320px width and test at 320, 375, 430, 768,
    1024, and 1440px.
-   Avoid horizontal page overflow at all widths.
-   On mobile, use stacked cards, collapsible sections, tabs, and bottom
    action bars where appropriate.
-   Make tap targets at least about 44px high.
-   The wheel must fit mobile screens without clipping.
-   Use `min-height: 100dvh` where appropriate and account for mobile
    browser viewport behavior.
-   Modals must fit small screens, scroll internally when needed, and be
    dismissible via explicit controls.
-   Respect `prefers-reduced-motion`.
-   Ensure keyboard accessibility, visible focus, semantic buttons, and
    accessible dialog labels.
-   Provide loading, empty, error, offline/disconnected, disabled, and
    success states.

### Feedback and copy

Use clear, lively, short messages: - "You're on the clock!" - "The wheel
has spoken..." - "Locked in! Pick confirmed." - "That player is already
off the board." - "Trade offer is on the table." - "Trade accepted ---
squads updated." - "The analysts are in the booth..." - "Time to reveal
the draft verdict."

## 7. Gemini evaluation contract

Create a server-side service such as `evaluationService.ts`.

### Input

For every participant, send: - Participant display name. - Ordered main
squad players and roles if known. - Impact Player. - Captain,
vice-captain, and wicketkeeper. - Any known player metadata from the
local dataset.

### Prompt requirements

Tell the model: - You are an entertaining IPL fantasy squad analyst. -
Score every team on the exact ten criteria, each integer from 0 to 10. -
Apply consistent standards across teams and do not intentionally favor
the host or any participant. - Base reasoning on the listed squads and
known player roles; if uncertain about a player's current real-world
form, do not pretend to have live knowledge. - Do not add, remove, or
rename players. - Return JSON only in the agreed schema. - Include a
short fun verdict per team, no more than 35 words. - Include a short
reason for each criterion score. - Do not make claims that the
evaluation predicts actual match outcomes.

Suggested conceptual output:

``` json
{
  "teams": [
    {
      "playerId": "server-player-id",
      "teamName": "display name",
      "scores": {
        "topOrderBatting": { "score": 8, "reason": "..." },
        "middleOrderBatting": { "score": 7, "reason": "..." },
        "finishingAbility": { "score": 8, "reason": "..." },
        "allRounders": { "score": 7, "reason": "..." },
        "spinBowling": { "score": 8, "reason": "..." },
        "powerplayBowling": { "score": 7, "reason": "..." },
        "deathBowling": { "score": 8, "reason": "..." },
        "athleticismFielding": { "score": 8, "reason": "..." },
        "leadershipExperience": { "score": 8, "reason": "..." },
        "teamBalanceRoleClarity": { "score": 9, "reason": "..." }
      },
      "verdict": "..."
    }
  ]
}
```

The server must validate the response against the room's actual player
IDs and expected team IDs. Do not accept a model response that omits a
team, adds an unknown team, duplicates a team, uses scores outside
0--10, or includes unexpected criterion keys. If validation fails, retry
once if reasonable, then use the fallback evaluator. Calculate totals
server-side.

### API configuration

-   Include `.env.example` with `GEMINI_API_KEY=` and `GEMINI_MODEL=`
    placeholders.
-   Never commit `.env`.
-   If no API key is configured, immediately use the fallback evaluator
    and explain this in the README.
-   Do not call the model from React.
-   Do not require an API key to run the game locally.

### Fallback evaluator

Implement a deterministic, clearly labeled backup that gives plausible
category scores using the local player roles and simple heuristics. It
does not need to be sophisticated. Use the same score schema and total
calculation, and make the result screen visually identical apart from
the fallback note.

## 8. Security, reliability, and edge cases

-   Validate all Socket.IO payloads at runtime (Zod or a small
    equivalent validator).
-   Do not trust `playerId`, ownership, franchise, phase, turn, score,
    or total supplied by the client.
-   Derive the acting participant from the socket's validated room
    session, not from a freely supplied player ID.
-   Handle stale clients and duplicate clicks gracefully.
-   If the host disconnects, preserve the room and elect a new host
    after the reconnection grace period if necessary.
-   If the active drafter disconnects, pause the draft briefly and show
    reconnect status. If they do not return, offer the host a clear
    recovery option rather than silently skipping a turn.
-   Never leave the room stuck in `spinInProgress` after an error; reset
    it safely.
-   On server restart, rooms may be lost. This is expected and should be
    documented.
-   Use a cleanup timer for inactive/empty rooms.
-   Do not log API keys or sensitive environment variables.
-   Use environment variables for server port and AI configuration.
-   Set appropriate CORS configuration for local client/server
    development.
-   Display friendly errors to users; log technical details server-side
    without exposing secrets.

## 9. Deliverables

Copilot should create: 1. Complete frontend and backend code. 2. Working
room creation/joining with six-digit codes. 3. Real-time lobby and game
updates across separate browsers/devices. 4. Server-authoritative wheel,
picks, turn order, and squad assignment. 5. Trade window with exactly
one pending trade at a time. 6. Squad batting-order management and role
selection. 7. Gemini evaluation plus a working fallback. 8. Responsive
styling and animations. 9. `.env.example` and `.gitignore`. 10. A
thorough `README.md` with install/run instructions, architecture
overview, room/game rules, environment variables, known limitations, and
manual test checklist. 11. No database and no persistent game history.

## 10. Build plan for Copilot

Implement in this order, keeping the project runnable at every stage:

### Stage 1 --- Project foundation

-   Set up client, server, TypeScript, Socket.IO, and shared types.
-   Add root scripts to run client and server together.
-   Add health/status endpoint and clear console logs.
-   Add the local franchise/player seed data.

### Stage 2 --- Rooms and lobby

-   Create/join/leave room.
-   Unique six-digit room codes.
-   Name validation, host designation, capacity limit.
-   Live lobby state and host-only start.
-   Reconnection behavior and phase-based join lock.

### Stage 3 --- Draft engine

-   Server-generated turn order and snake-draft indexing.
-   Spin result generated on server and broadcast to all.
-   Wheel animation.
-   Franchise-filtered player selection and confirmation.
-   Atomic pick assignment and global picked state.
-   Draft completion after exactly 12 picks per participant.

### Stage 4 --- Trades and squads

-   Trade phase transition controlled by host.
-   Single pending trade workflow with accept/reject/cancel.
-   Batting order drag-and-drop plus move-up/down controls.
-   Captain, vice-captain, wicketkeeper, and Impact Player presentation.
-   Finalization checks.

### Stage 5 --- AI evaluation and results

-   Gemini integration on the server.
-   Structured response validation and server-side totals.
-   Deterministic fallback.
-   Results reveal, category scores, awards, tie handling.

### Stage 6 --- Polish and testing

-   Responsive layouts at all specified widths.
-   Accessibility, reduced motion, keyboard support.
-   Error/empty/loading/disconnect states.
-   Run type checks, lint, and tests; fix all build errors.
-   Write exact run commands and manual test steps in README.

Do not stop after producing a visual mockup. The end goal is a working
multiplayer app with actual cross-device state synchronization.

## 11. Manual acceptance checklist

The project is not complete until the following scenarios work:

### Rooms

-   [ ] A host creates a room and sees a six-digit code.
-   [ ] Two or more separate browsers/devices can join with the code.
-   [ ] Lobby player count updates live for everyone.
-   [ ] The host cannot start with fewer than two players.
-   [ ] The host can start with 2, 3, 4, 5, 6, 7, or 8 players.
-   [ ] A ninth player cannot join.
-   [ ] No new player can join after the draft starts.
-   [ ] Invalid room codes and duplicate names show friendly errors.

### Draft

-   [ ] Everyone sees the same turn order and current active player.
-   [ ] Only the active player can spin.
-   [ ] Every device sees the same spin result.
-   [ ] The active player can only pick from the spun franchise.
-   [ ] Confirmation is required before the pick is committed.
-   [ ] A picked player is unavailable everywhere immediately.
-   [ ] No player can be picked twice.
-   [ ] A franchise with no remaining players allows a re-spin.
-   [ ] Every participant ends with 11 main squad players plus one
    Impact Player.
-   [ ] The draft completes only after all participants have 12 players.

### Trades and squads

-   [ ] Only the host can open/close the trade window.
-   [ ] Only one trade proposal can be pending at a time.
-   [ ] Only the target player's owner can accept/reject.
-   [ ] The proposer can cancel their pending trade.
-   [ ] Accepting a trade swaps ownership atomically and updates all
    clients.
-   [ ] Rejected/cancelled trades do not change squads.
-   [ ] Squad size stays 12 after every trade.
-   [ ] Reordering works on mobile and desktop, with accessible up/down
    controls.
-   [ ] Captain and vice-captain are different players from the main 11.
-   [ ] Wicketkeeper is selected from the main 11.
-   [ ] Impact Player remains in the dedicated 12th slot.
-   [ ] Evaluation cannot start until all participants finalize roles.

### Evaluation and results

-   [ ] Gemini API key is never sent to the browser.
-   [ ] Valid AI results show ten category scores per squad.
-   [ ] Overall total is computed by server code and is out of 100.
-   [ ] Invalid AI output or API failure triggers the fallback
    evaluator.
-   [ ] Everyone sees the same results.
-   [ ] Tied totals produce joint champions.
-   [ ] Users can start a fresh room without needing a previous match
    record.

### Responsive and quality

-   [ ] No horizontal page overflow at 320px, 375px, 430px, 768px,
    1024px, or 1440px.
-   [ ] Buttons and controls are usable by touch.
-   [ ] Reduced-motion preferences are respected.
-   [ ] Errors and disconnected states are visible and understandable.
-   [ ] `npm install` and the documented dev command work from a fresh
    checkout.
-   [ ] Type checks and production builds pass.

## 12. Important implementation decisions

-   **No database:** all room/game state stays in memory. Restarting the
    server clears games.
-   **No authentication:** room membership uses a temporary generated
    session ID, validated by the server. This is for a private friends'
    game, not a security-sensitive service.
-   **Server is authoritative:** all random choices and game-rule checks
    happen on the server.
-   **Current rosters are a local snapshot:** keep them editable in a
    data file; do not depend on a live roster API.
-   **Evaluation is entertainment:** scores are subjective and should
    not be presented as professional predictions.
-   **Keep scope controlled:** do not add chat, spectator mode,
    payments, rankings, persistent accounts, historical stats,
    tournaments, or a database unless explicitly requested later.

## 13. Final instruction to Copilot

Read this entire specification before coding. First create a short
implementation checklist and then implement the complete app in stages.
Make sensible decisions without repeatedly asking questions. If a small
detail is unspecified, choose the simplest reliable option consistent
with this document and note it in the README. Run the app, type-check
it, fix errors, and verify the acceptance checklist as far as the
environment permits. Prioritize a working, end-to-end game over
unnecessary abstractions or overengineering.
