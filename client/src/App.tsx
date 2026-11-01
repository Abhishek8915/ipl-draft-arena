import { useCallback, useEffect, useMemo, useState } from "react";
import type { ActionAck, EvaluationCriterionKey, EvaluationResult, IplPlayer, RoomState, Squad } from "../../shared/types";
import { EVALUATION_CRITERIA, FRANCHISES } from "../../shared/types";
import { IPL_PLAYERS } from "../../shared/iplPlayers";
import { FranchiseBadge } from "./components/FranchiseBadge";
import SquadCard from "./components/SquadCard";
import Wheel from "./components/Wheel";
import { getEligibleDraftPlayers } from "./lib/draftPool";
import { socket } from "./lib/socket";

type ModalState = { kind: "pick"; playerId: string } | { kind: "none" };
const playersById = new Map<string, IplPlayer>(IPL_PLAYERS.map((player) => [player.id, player]));
const labels: Record<string, string> = {
  lobby: "The huddle", draft: "Live draft", draftComplete: "Draft complete",
  trade: "Trade window", finalize: "Squad lock-in", evaluating: "Analysts at work", results: "Final scorecard"
};
const superlatives: Partial<Record<EvaluationCriterionKey, string>> = {
  topOrderBatting: "Powerplay Monsters", finishingAbility: "Finishing School", spinBowling: "Spin Wizards",
  powerplayBowling: "New-Ball Ninjas", deathBowling: "Death-Over Demons", athleticismFielding: "Fielding Fireworks",
  leadershipExperience: "Captaincy Material", teamBalanceRoleClarity: "Most Balanced XI"
};

function storageRead(key: string): string {
  try { return sessionStorage.getItem(key) ?? ""; } catch { return ""; }
}

function storageWrite(roomCode: string, playerId: string): void {
  try {
    sessionStorage.setItem("ipl-room-code", roomCode);
    sessionStorage.setItem("ipl-player-id", playerId);
  } catch {
    // The active socket remains usable when browser storage is unavailable.
  }
}

function clearStoredSession(): void {
  try {
    sessionStorage.removeItem("ipl-room-code");
    sessionStorage.removeItem("ipl-player-id");
  } catch {
    // A fresh room can still be created without session storage.
  }
}

export default function App() {
  const [room, setRoom] = useState<RoomState>();
  const [playerId, setPlayerId] = useState(storageRead("ipl-player-id"));
  const [displayName, setDisplayName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [mode, setMode] = useState<"create" | "join">("create");
  const [connected, setConnected] = useState(socket.connected);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<ModalState>({ kind: "none" });
  const [offeredId, setOfferedId] = useState("");
  const [targetId, setTargetId] = useState("");
  const [roles, setRoles] = useState({ captain: "", viceCaptain: "", wicketkeeper: "" });
  const [copied, setCopied] = useState(false);
  const localSquad: Squad | undefined = room?.squads[playerId];

  const send = useCallback((event: string, payload?: unknown): Promise<ActionAck> => new Promise((resolve) => {
    if (!socket.connected) {
      const result = { ok: false, error: "You're offline. Reconnect before taking that action." };
      setError(result.error);
      resolve(result);
      return;
    }
    socket.timeout(10_000).emit(event, payload ?? {}, (timeoutError: Error | null, response: ActionAck) => {
      if (timeoutError) {
        const result = { ok: false, error: "The server did not respond. Please try again." };
        setError(result.error);
        resolve(result);
        return;
      }
      if (!response?.ok) {
        setError(response?.error ?? "That action could not be completed.");
        resolve(response ?? { ok: false });
        return;
      }
      setError("");
      resolve(response);
    });
  }), []);

  useEffect(() => {
    const savedRoomCode = storageRead("ipl-room-code");
    const savedPlayerId = storageRead("ipl-player-id");
    const onConnect = () => {
      setConnected(true);
      if (savedRoomCode && savedPlayerId) {
        socket.emit("room:resume", { code: savedRoomCode, playerId: savedPlayerId }, (response: ActionAck) => {
          if (!response?.ok) {
            clearStoredSession();
            setPlayerId("");
            setError(response?.error ?? "Your saved room session could not be restored.");
          }
        });
      }
    };
    const onDisconnect = () => setConnected(false);
    const onState = (next: RoomState) => {
      setRoom(next);
      setPlayerId((current) => current || storageRead("ipl-player-id"));
      setError("");
      const own = next.squads[storageRead("ipl-player-id")];
      if (next.phase === "finalize" && own?.roles.captain && own.roles.viceCaptain && own.roles.wicketkeeper) {
        setRoles({ captain: own.roles.captain, viceCaptain: own.roles.viceCaptain, wicketkeeper: own.roles.wicketkeeper });
      }
    };
    const onError = (payload: { message?: string }) => setError(payload?.message ?? "Something went wrong.");
    const onClosed = (payload: { message?: string }) => {
      setNotice(payload?.message ?? "The room has closed.");
      setRoom(undefined);
      setPlayerId("");
      socket.auth = {};
      clearStoredSession();
    };
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("room:state", onState);
    socket.on("room:error", onError);
    socket.on("room:closed", onClosed);
    if (socket.connected) onConnect();
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("room:state", onState);
      socket.off("room:error", onError);
      socket.off("room:closed", onClosed);
    };
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 4_000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const activePosition = room && room.players.length ? room.currentPickNumber % room.players.length : 0;
  const activeTurnId = room?.turnOrder.length
    ? room.turnOrder[activePosition]
    : undefined;
  const activePlayer = room?.players.find((player) => player.id === activeTurnId);
  const isHost = room?.hostPlayerId === playerId;
  const isMyTurn = room?.phase === "draft" && activePlayer && (activePlayer.id === playerId || (isHost && !activePlayer.connected));
  const myPickedPlayer = modal.kind === "pick" ? playersById.get(modal.playerId) : undefined;
  const availableForSpin = room?.currentSpinFranchiseId
    ? IPL_PLAYERS.filter((player) => player.franchiseId === room.currentSpinFranchiseId && !room.pickedPlayerIds.includes(player.id))
    : [];
  const displayedPool = useMemo(() => {
    if (!room || room.phase !== "draft" || room.spinInProgress) return [];
    return getEligibleDraftPlayers(IPL_PLAYERS, room.pickedPlayerIds, room.currentSpinFranchiseId, search);
  }, [room?.phase, room?.spinInProgress, room?.currentSpinFranchiseId, room?.pickedPlayerIds, search]);

  async function createOrJoin(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const result = mode === "create"
      ? await send("room:create", { name: displayName })
      : await send("room:join", { code: joinCode.trim(), name: displayName });
    if (result.ok && result.playerId && result.roomCode) {
      setPlayerId(result.playerId);
      storageWrite(result.roomCode, result.playerId);
      socket.auth = { sessionId: result.playerId, roomCode: result.roomCode };
    }
    setBusy(false);
  }

  async function action(event: string, payload?: unknown) {
    setBusy(true);
    const result = await send(event, payload);
    setBusy(false);
    return result.ok;
  }

  async function copyInvite() {
    if (!room) return;
    try {
      await navigator.clipboard.writeText(`Join my IPL Draft Arena room: ${room.code}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2_000);
    } catch {
      setError("Couldn't copy automatically. Select the room code and copy it to share.");
    }
  }

  function resetToHome() {
    socket.emit("room:leave");
    socket.auth = {};
    setRoom(undefined);
    setPlayerId("");
    clearStoredSession();
    setError("");
    setNotice("");
  }

  async function startDraft() {
    if (window.confirm("Ready to lock the lobby and start the draft? New players won't be able to join once it begins.")) {
      await action("lobby:start");
    }
  }

  async function proposeTrade() {
    if (await action("trade:propose", { offeredPlayerId: offeredId, targetPlayerId: targetId })) {
      setOfferedId("");
      setTargetId("");
    }
  }

  function reorder(playerIds: string[]) {
    void action("squad:reorder", { playerIds });
  }

  if (!room) {
    return (
      <main className="home-page">
        <div className="stadium-glow" aria-hidden="true" />
        <header className="brand-lockup"><span className="brand-ball">●</span><span>IPL <b>DRAFT ARENA</b></span><span className="live-pill">LIVE GAME</span></header>
        <section className="home-hero">
          <div className="hero-copy">
            <p className="eyebrow eyebrow--gold">THE ULTIMATE FRIENDS DRAFT</p>
            <h1>Spin. Pick.<br /><span>Build a champion.</span></h1>
            <p className="hero-subtitle">Your IPL fantasy night starts here. Draft the stars, make the trades, and let the squad showdown begin.</p>
            <div className="feature-pills"><span>♟ 2–8 players</span><span>◉ Live multiplayer</span><span>🏏 10 franchises</span></div>
          </div>
          <div className="entry-card">
            <div className="entry-tabs" role="tablist" aria-label="Room action">
              <button type="button" className={mode === "create" ? "active" : ""} onClick={() => { setMode("create"); setError(""); }}>Create room</button>
              <button type="button" className={mode === "join" ? "active" : ""} onClick={() => { setMode("join"); setError(""); }}>Join room</button>
            </div>
            <form onSubmit={createOrJoin}>
              <label htmlFor="display-name">Your display name</label>
              <input id="display-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} minLength={2} maxLength={18} placeholder="e.g. Boundary Boss" required autoComplete="nickname" />
              {mode === "join" && <>
                <label htmlFor="room-code">Six-digit room code</label>
                <input id="room-code" className="code-input" value={joinCode} onChange={(event) => setJoinCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" pattern="\d{6}" maxLength={6} placeholder="000000" required />
              </>}
              {error && <p className="inline-error" role="alert">{error}</p>}
              {notice && <p className="inline-notice" role="status">{notice}</p>}
              <button className="button button--primary button--wide" disabled={busy || !connected}>{busy ? <><span className="button-spinner" /> Connecting...</> : <>{mode === "create" ? "Create your room" : "Join the huddle"}<span aria-hidden="true">→</span></>}</button>
              {!connected && <p className="connection-message"><span className="connection-dot connection-dot--offline" /> Reconnecting to the game server...</p>}
              <p className="entry-footnote">No accounts. No downloads. Just your crew and the draft.</p>
            </form>
          </div>
        </section>
        <section className="how-it-works">
          <div><span className="step-number">01</span><strong>Spin the wheel</strong><small>Every pick starts with a franchise surprise.</small></div>
          <div><span className="step-number">02</span><strong>Draft your XI</strong><small>Build 11 starters and name your Impact Player.</small></div>
          <div><span className="step-number">03</span><strong>Trade &amp; celebrate</strong><small>Set your roles and reveal the squad verdict.</small></div>
        </section>
      </main>
    );
  }

  const fullSquads = room.players.map((owner) => ({ owner, squad: room.squads[owner.id] }));
  const selectedTradeTargetOwner = room.players.find((owner) => room.squads[owner.id]?.playerIds.includes(targetId));
  const canAccept = room.pendingTrade?.targetOwnerId === playerId;
  const canCancel = room.pendingTrade?.proposerId === playerId;
  const rolesComplete = room.players.every((player) => room.squads[player.id]?.finalized);

  return (
    <main className="game-shell">
      <header className="game-topbar">
        <button type="button" className="brand-button" onClick={resetToHome}><span className="brand-ball">●</span><span>IPL <b>DRAFT ARENA</b></span></button>
        <div className="room-chip"><span className={`connection-dot${connected ? "" : " connection-dot--offline"}`} /> {connected ? "LIVE" : "RECONNECTING"} <span className="room-chip__divider" /> ROOM <strong>{room.code}</strong></div>
        <button type="button" className="button button--ghost topbar-leave" onClick={resetToHome}>Leave game</button>
      </header>
      <div className="game-content">
        <section className="game-heading">
          <div><p className="eyebrow eyebrow--gold">{labels[room.phase]}</p><h1>{room.phase === "draft" ? "The draft is on." : room.phase === "results" ? "The verdict is in." : room.phase === "lobby" ? "The huddle is forming." : "Build your dream XI."}</h1></div>
          <div className="heading-count"><strong>{room.players.length}<small> / 8</small></strong><span>players in the room</span></div>
        </section>
        {(error || notice || room.tradeNotice) && <div className={`toast${error ? " toast--error" : ""}`} role={error ? "alert" : "status"}>{error || room.tradeNotice || notice}<button type="button" aria-label="Dismiss message" onClick={() => { setError(""); setNotice(""); }}>×</button></div>}

        {room.phase === "lobby" && (
          <section className="lobby-layout">
            <div className="panel lobby-panel">
              <div className="panel-heading"><div><p className="eyebrow">YOUR PRIVATE ROOM</p><h2>Bring your crew in</h2></div><div className="lobby-count">{room.players.length}<span> / 8</span></div></div>
              <div className="invite-box"><div><span className="eyebrow">ROOM CODE</span><strong>{room.code}</strong></div><button type="button" className="button button--secondary" onClick={() => void copyInvite()}>{copied ? "Copied!" : "Copy invite"}</button></div>
              <p className="muted-copy">Share the six-digit code with friends. The lobby locks as soon as the draft starts.</p>
              <div className="player-list">{room.players.map((player, index) => <div className="player-list-row" key={player.id}><span className="avatar">{player.name.slice(0, 1).toUpperCase()}</span><strong>{player.name}{player.id === playerId && <small> YOU</small>}</strong>{player.isHost && <span className="tag tag--gold">HOST</span>}<span className={`player-status${player.connected ? "" : " player-status--offline"}`}>{player.connected ? "Ready" : "Offline"}</span><span className="roster-index">{String(index + 1).padStart(2, "0")}</span></div>)}</div>
              {isHost ? <button className="button button--primary button--wide lobby-start" disabled={room.players.length < 2 || room.players.length > 8 || busy || room.players.some((player) => !player.connected)} onClick={() => void startDraft()}>{room.players.length < 2 ? "Waiting for one more player" : "Lock lobby & start draft"} <span>→</span></button>
                : <div className="waiting-message"><span className="pulse-dot" /> Waiting for {room.players.find((player) => player.id === room.hostPlayerId)?.name ?? "the host"} to start the draft...</div>}
            </div>
            <aside className="panel lobby-aside"><div className="mini-wheel">🏏</div><p className="eyebrow eyebrow--gold">GAME NIGHT RULES</p><h3>One pick at a time.<br />No take-backs.</h3><ul><li>Every squad gets 11 starters + an Impact Player.</li><li>Turn order repeats after every round.</li><li>Save your best move for the trade window.</li></ul><div className="aside-note">Need a second player to get rolling.</div></aside>
          </section>
        )}

        {room.phase === "draft" && (
          <>
            <section className="turn-banner">
              <div className="turn-live"><span className="pulse-dot" /> PICK {String(room.currentPickNumber + 1).padStart(2, "0")} <span>/ {room.totalPicks}</span></div>
              <div className="turn-player"><small>{activePlayer?.connected ? "ON THE CLOCK" : "HOST TAKEOVER AVAILABLE"}</small><strong>{activePlayer?.name ?? "Waiting..."}</strong></div>
              <div className="turn-progress"><div className="progress-track"><span style={{ width: `${(room.currentPickNumber / room.totalPicks) * 100}%` }} /></div><small>{room.players.length ? Math.floor(room.currentPickNumber / room.players.length) + 1 : 1} / 12 rounds</small></div>
            </section>
            <div className="draft-layout">
              <section className="draft-main">
                <div className="panel wheel-panel">
                  <div className="panel-heading panel-heading--center"><div><p className="eyebrow eyebrow--gold">THE FRANCHISE SPIN</p><h2>{room.currentSpinFranchiseId ? "The wheel has spoken..." : "Who are we drafting?"}</h2></div></div>
                  <Wheel selected={room.currentSpinFranchiseId} spinning={room.spinInProgress} />
                  {room.currentSpinFranchiseId && !room.spinInProgress && <div className="spin-result"><FranchiseBadge id={room.currentSpinFranchiseId} /><strong>{FRANCHISES.find((team) => team.id === room.currentSpinFranchiseId)?.name}</strong></div>}
                  {!isMyTurn && <p className="disabled-hint">Only {activePlayer?.name ?? "the active player"} can spin this turn.</p>}
                  {isMyTurn && !room.currentSpinFranchiseId && <button className="button button--primary spin-button" disabled={busy} onClick={() => void action("draft:spin")}>{busy ? "Winding up..." : "Spin the wheel"} <span>✦</span></button>}
                  {room.currentSpinFranchiseId && !room.spinInProgress && availableForSpin.length > 0 && <p className="spin-prompt"><span className="pulse-dot" /> You're on the clock! Pick from this franchise below.</p>}
                  {room.currentSpinFranchiseId && !room.spinInProgress && availableForSpin.length === 0 && <div className="empty-franchise"><strong>No players left from this franchise.</strong><span>This pick doesn't count. Spin again to find your next star.</span>{isMyTurn && <button className="button button--secondary" disabled={busy} onClick={() => void action("draft:spin-again")}>Spin again</button>}</div>}
                </div>
                <div className="panel pool-panel">
                  <div className="panel-heading"><div><p className="eyebrow">ELIGIBLE PLAYER POOL{room.currentSpinFranchiseId && !room.spinInProgress ? ` · ${room.currentSpinFranchiseId}` : ""}</p><h2>Find your next pick</h2></div><span className="pool-count">{room.spinInProgress ? "Spinning" : room.currentSpinFranchiseId ? `${availableForSpin.length} available` : "Spin to begin"}</span></div>
                  <div className="pool-filters"><input aria-label="Search eligible players from the selected franchise" placeholder="Search eligible players..." value={search} onChange={(event) => setSearch(event.target.value)} /></div>
                  <div className="pool-list">
                    {displayedPool.map((player) => {
                      const eligible = Boolean(isMyTurn);
                      return <div className={`pool-row${eligible ? " pool-row--eligible" : ""}`} key={player.id}>
                        <FranchiseBadge id={player.franchiseId} small /><div className="pool-player-info"><strong>{player.name}</strong><small>{player.role.replace("-", " ")}</small></div>
                        <span className="availability">Available</span>
                        {eligible && <button className="button button--tiny" onClick={() => setModal({ kind: "pick", playerId: player.id })}>Select</button>}
                      </div>;
                    })}
                    {room.spinInProgress && <p className="empty-note">The wheel is spinning. Eligible players will appear when it lands.</p>}
                    {!room.spinInProgress && !room.currentSpinFranchiseId && <p className="empty-note">Spin the wheel to see available players from the selected franchise.</p>}
                    {!room.spinInProgress && room.currentSpinFranchiseId && displayedPool.length === 0 && <p className="empty-note">{availableForSpin.length === 0 ? "No eligible players are left from this franchise." : "No players match that search."}</p>}
                  </div>
                </div>
              </section>
              <aside className="draft-side">
                <div className="panel draft-order-panel"><p className="eyebrow">SNAKE DRAFT ORDER</p><div className="draft-order-list">{room.turnOrder.map((id, index) => {
                  const person = room.players.find((player) => player.id === id);
                  return <div key={id} className={`draft-order-row${activePlayer?.id === id ? " is-active" : ""}`}><span>{index + 1}</span><strong>{person?.name}</strong>{activePlayer?.id === id && <small>UP</small>}</div>;
                })}</div></div>
                <div className="panel recent-panel"><p className="eyebrow">RECENT PICKS</p>{room.pickedPlayerIds.length === 0 ? <p className="empty-note">The board is clear. First pick is up!</p> : [...room.pickedPlayerIds].slice(-6).reverse().map((id) => {
                  const player = playersById.get(id);
                  const owner = room.players.find((participant) => room.squads[participant.id]?.playerIds.includes(id));
                  return <div className="recent-pick-row" key={id}><span className="recent-pick-ball">✓</span><span><strong>{player?.name}</strong><small>{owner?.name} · {player?.franchiseId}</small></span></div>;
                })}</div>
                <section className="panel live-squads-panel" aria-label="Live draft squads">
                  <p className="eyebrow">LIVE SQUADS · {room.players.length}</p>
                  <div className="draft-squads-strip">{fullSquads.map(({ owner, squad }) => squad && <article className={`mini-squad${owner.id === playerId ? " mini-squad--mine" : ""}`} key={owner.id}>
                    <header><strong>{owner.name}{owner.id === playerId ? " · YOU" : ""}</strong><span>{squad.playerIds.length}/12</span></header>
                    <ol>{squad.battingOrder.map((id, index) => <li key={id}><span>{index + 1}</span>{playersById.get(id)?.name}</li>)}</ol>
                    {squad.impactPlayerId && <div className="mini-squad-impact"><span>IMPACT</span><strong>{playersById.get(squad.impactPlayerId)?.name}</strong></div>}
                    {!squad.playerIds.length && <p className="empty-note">Waiting for first pick.</p>}
                  </article>)}</div>
                </section>
              </aside>
            </div>
          </>
        )}

        {room.phase === "draftComplete" && <section className="phase-interstitial panel"><span className="interstitial-icon">🏆</span><p className="eyebrow eyebrow--gold">ALL PICKS ARE LOCKED</p><h2>The squads are stacked.</h2><p>Every player has 11 starters and an Impact Player. Take a look at the lineups, then open the trade window if the room is ready.</p><div className="interstitial-stats"><span><strong>{room.players.length}</strong> squads</span><span><strong>12</strong> players each</span><span><strong>{room.totalPicks}</strong> total picks</span></div>{isHost ? <button className="button button--primary" disabled={busy} onClick={() => void action("trade:open")}>Open trade window <span>→</span></button> : <div className="waiting-message"><span className="pulse-dot" /> Waiting for the host to open trades...</div>}</section>}

        {room.phase === "trade" && <section className="trade-layout">
          <div className="trade-main">
            <div className="panel phase-banner"><p className="eyebrow eyebrow--gold">THE MARKET IS OPEN</p><h2>Make a move. Change the game.</h2><p>One offer at a time. Exact one-for-one swaps keep both squads at 12 players.</p></div>
            {room.pendingTrade && (() => {
              const proposal = room.pendingTrade!;
              const proposer = room.players.find((player) => player.id === proposal.proposerId);
              const targetOwner = room.players.find((player) => player.id === proposal.targetOwnerId);
              const offered = playersById.get(proposal.offeredPlayerId);
              const target = playersById.get(proposal.targetPlayerId);
              return <div className="panel pending-trade"><div className="pending-title"><span className="trade-icon">⇄</span><div><p className="eyebrow">TRADE OFFER ON THE TABLE</p><h3>{proposer?.name} wants to deal</h3></div><span className="tag tag--gold">PENDING</span></div>
                <div className="swap-display"><div><small>{proposer?.name} offers</small><strong>{offered?.name}</strong><span>{offered?.franchiseId}</span></div><span className="swap-arrow">⇄</span><div><small>{targetOwner?.name} receives</small><strong>{target?.name}</strong><span>{target?.franchiseId}</span></div></div>
                {canAccept ? <div className="trade-controls"><button className="button button--primary" disabled={busy} onClick={() => void action("trade:accept")}>Accept trade</button><button className="button button--ghost" disabled={busy} onClick={() => void action("trade:reject")}>Reject</button></div>
                  : canCancel ? <button className="button button--ghost" disabled={busy} onClick={() => void action("trade:cancel")}>Cancel my offer</button>
                    : <p className="muted-copy">Waiting for {targetOwner?.name} to respond. Only the target player's owner can accept or reject.</p>}
              </div>;
            })()}
            {!room.pendingTrade && <div className="panel propose-panel"><p className="eyebrow">PROPOSE A TRADE</p><h3>Put a player on the table</h3>
              <div className="trade-selects"><label>Your player<select value={offeredId} onChange={(event) => setOfferedId(event.target.value)}><option value="">Choose from your squad</option>{(localSquad?.playerIds ?? []).map((id) => <option key={id} value={id}>{playersById.get(id)?.name}{id === localSquad?.impactPlayerId ? " · Impact" : ""}</option>)}</select></label>
                <label>Target player<select value={targetId} onChange={(event) => setTargetId(event.target.value)}><option value="">Choose another squad's player</option>{room.players.filter((owner) => owner.id !== playerId).flatMap((owner) => (room.squads[owner.id]?.playerIds ?? []).map((id) => <option key={id} value={id}>{owner.name} — {playersById.get(id)?.name}</option>))}</select></label></div>
              <button className="button button--primary" disabled={!offeredId || !targetId || busy} onClick={() => void proposeTrade()}>Propose trade <span>→</span></button>
              {selectedTradeTargetOwner && <small className="trade-owner-note">Offer will go to {selectedTradeTargetOwner.name}.</small>}
            </div>}
            {isHost && <button className="button button--secondary close-trade" disabled={busy || Boolean(room.pendingTrade)} onClick={() => void action("trade:close")}>Close trade window &amp; finalize squads <span>→</span></button>}
          </div>
          <aside className="squads-panel"><div className="section-title"><div><p className="eyebrow">YOUR DRAFTED SQUADS</p><h2>Batting cards</h2></div><span className="scroll-hint">Swipe to explore →</span></div><div className="squad-grid">{fullSquads.map(({ owner, squad }) => squad && <SquadCard key={owner.id} owner={owner} squad={squad} playersById={playersById} isMine={owner.id === playerId} editable={owner.id === playerId} onReorder={reorder} />)}</div></aside>
        </section>}

        {room.phase === "finalize" && <section className="finalize-layout">
          <div className="panel finalize-intro"><p className="eyebrow eyebrow--gold">LAST CALL BEFORE THE SCORECARD</p><h2>Name your leaders.</h2><p>Choose your captain, vice-captain, and wicketkeeper from your main XI. The Impact Player stays in the dedicated 12th slot.</p><div className="role-form">
            {(["captain", "viceCaptain", "wicketkeeper"] as const).map((role) => <label key={role}>{role === "viceCaptain" ? "Vice-captain" : role === "wicketkeeper" ? "Wicketkeeper" : "Captain"}<select value={roles[role]} onChange={(event) => setRoles((current) => ({ ...current, [role]: event.target.value }))}><option value="">Select a player</option>{(localSquad?.battingOrder ?? []).map((id) => <option key={id} value={id}>{playersById.get(id)?.name}</option>)}</select></label>)}
            <button className="button button--primary" disabled={!roles.captain || !roles.viceCaptain || !roles.wicketkeeper || roles.captain === roles.viceCaptain || busy} onClick={() => void action("squad:roles:update", roles)}>Lock in roles <span>✓</span></button>
          </div><div className="role-checklist"><span className={roles.captain ? "complete" : ""}>✓ Captain selected</span><span className={roles.viceCaptain && roles.captain !== roles.viceCaptain ? "complete" : ""}>✓ Different vice-captain</span><span className={roles.wicketkeeper ? "complete" : ""}>✓ Wicketkeeper selected</span></div></div>
          <div className="finalize-side"><div className="panel completion-panel"><p className="eyebrow">ROOM CHECKLIST</p>{room.players.map((participant) => <div className="completion-row" key={participant.id}><span className={room.squads[participant.id]?.finalized ? "completion-check done" : "completion-check"}>{room.squads[participant.id]?.finalized ? "✓" : "·"}</span><span>{participant.name}{participant.id === playerId ? " (you)" : ""}</span><strong>{room.squads[participant.id]?.finalized ? "READY" : "PENDING"}</strong></div>)}
            {isHost && <button className="button button--primary button--wide evaluation-start" disabled={!rolesComplete || busy} onClick={() => void action("evaluation:start")}>{rolesComplete ? "Go for evaluation" : "Waiting for every squad"} <span>→</span></button>}</div>
            <p className="muted-copy">Reorder your XI using the move buttons on your squad card. All other squads and assignments update live.</p>
          </div>
          <div className="squads-panel"><div className="section-title"><div><p className="eyebrow">FINAL LINEUPS</p><h2>Every spot matters</h2></div></div><div className="squad-grid">{fullSquads.map(({ owner, squad }) => squad && <SquadCard key={owner.id} owner={owner} squad={squad} playersById={playersById} isMine={owner.id === playerId} editable={owner.id === playerId} onReorder={reorder} />)}</div></div>
        </section>}

        {room.phase === "evaluating" && <section className="evaluation-loading panel"><div className="loading-stumps"><i /><i /><i /><b /></div><p className="eyebrow eyebrow--gold">THE ANALYSTS ARE IN THE BOOTH...</p><h2>Running the numbers.<br /><span>Reading the room.</span></h2><p>Comparing every XI, from the top order to the last-over specialists.</p><div className="loading-ribbon"><span>Checking squad balance</span><span>Weighing the finishers</span><span>Scouting the bowling attack</span></div></section>}

        {room.phase === "results" && room.evaluation && <Results result={room.evaluation} room={room} playersById={playersById} onHome={resetToHome} onClose={() => void action("room:close")} isHost={Boolean(isHost)} />}

        {room.phase !== "draft" && room.phase !== "lobby" && room.phase !== "draftComplete" && room.phase !== "trade" && room.phase !== "finalize" && room.phase !== "evaluating" && room.phase !== "results" && <p className="empty-note">This game phase is unavailable.</p>}
      </div>

      {modal.kind === "pick" && myPickedPlayer && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setModal({ kind: "none" }); }}><section className="pick-modal" role="dialog" aria-modal="true" aria-labelledby="pick-title"><button className="modal-close" type="button" aria-label="Cancel pick" onClick={() => setModal({ kind: "none" })}>×</button><div className="modal-icon">🏏</div><p className="eyebrow eyebrow--gold">MAKE IT OFFICIAL?</p><h2 id="pick-title">Lock in this pick?</h2><div className="confirmed-player"><FranchiseBadge id={myPickedPlayer.franchiseId} /><strong>{myPickedPlayer.name}</strong><span>{FRANCHISES.find((team) => team.id === myPickedPlayer.franchiseId)?.name}</span></div><p>This pick is permanent and unavailable to everyone else.</p><div className="modal-actions"><button className="button button--ghost" onClick={() => setModal({ kind: "none" })}>Cancel</button><button className="button button--primary" disabled={busy} onClick={async () => { const success = await action("draft:pick", { playerId: myPickedPlayer.id }); if (success) setModal({ kind: "none" }); }}>Confirm pick <span>✓</span></button></div></section></div>}
      <footer className="game-footer"><span>Made for the love of the game.</span><span>Draft scores are for fun — not match predictions.</span></footer>
    </main>
  );
}

function Results({ result, room, playersById: _playersById, onHome, onClose, isHost }: {
  result: EvaluationResult; room: RoomState; playersById: Map<string, IplPlayer>; onHome: () => void; onClose: () => void; isHost: boolean;
}) {
  const sorted = [...result.teams].sort((a, b) => b.total - a.total);
  const topScore = sorted[0]?.total ?? 0;
  const champions = sorted.filter((team) => team.total === topScore);
  const displayName = (id: string) => room.players.find((player) => player.id === id)?.name ?? "Squad";
  const awards = Object.entries(superlatives) as [EvaluationCriterionKey, string][];
  return <section className="results-page">
    <div className="results-hero"><div className="confetti confetti--one" /><div className="confetti confetti--two" /><span className="trophy">🏆</span><p className="eyebrow eyebrow--gold">DRAFT NIGHT RESULTS</p><h2>{champions.length === 1 ? "Draft Champion" : "Joint Draft Champions"}</h2><h3>{champions.map((team) => displayName(team.playerId)).join(" & ")}</h3><div className="champion-score"><strong>{topScore}</strong><span>/ 100<br />BEST SQUAD ON PAPER</span></div><p className="results-disclaimer">A squad showdown for fun — not a prediction of real match results.</p></div>
    {result.note && <div className={`ai-note${result.source === "fallback" ? " ai-note--fallback" : ""}`}>{result.source === "fallback" ? "◌" : "✦"} {result.note ?? "Gemini squad analysis is ready."}</div>}
    <div className="results-columns"><section className="panel leaderboard"><div className="panel-heading"><div><p className="eyebrow">THE SCORECARD</p><h2>Squad standings</h2></div><span className="muted-copy">Scores out of 100</span></div>{sorted.map((team, index) => <article className={`result-team${team.total === topScore ? " result-team--champion" : ""}`} key={team.playerId}><div className="result-team-heading"><span className="rank-medal">{index < 3 ? ["1st", "2nd", "3rd"][index] : `${index + 1}th`}</span><div><h3>{displayName(team.playerId)}</h3><p>{team.verdict}</p></div><strong className="team-total">{team.total}<small>/100</small></strong></div><div className="score-grid">{EVALUATION_CRITERIA.map(({ key, label }) => <div className="score-item" key={key}><span>{label}</span><strong>{team.scores[key].score}<small>/10</small></strong><small className="score-reason">{team.scores[key].reason}</small><div className="score-track"><i style={{ width: `${team.scores[key].score * 10}%` }} /></div></div>)}</div></article>)}</section>
      <aside className="panel awards-panel"><p className="eyebrow eyebrow--gold">TONIGHT'S SUPERLATIVES</p><h2>Special mentions</h2>{awards.map(([key, title]) => { const highest = Math.max(...result.teams.map((team) => team.scores[key].score)); const winners = result.teams.filter((team) => team.scores[key].score === highest); return <div className="award-row" key={key}><span className="award-star">✦</span><div><strong>{title}</strong><small>{winners.map((team) => displayName(team.playerId)).join(" & ")} · {highest}/10</small></div></div>; })}<div className="awards-note">Ten lenses. One unforgettable draft night.</div></aside></div>
    <div className="results-actions"><button className="button button--primary" onClick={onHome}>Play again · Create a new room <span>→</span></button>{isHost && <button className="button button--ghost" onClick={onClose}>Close room</button>}</div>
  </section>;
}
