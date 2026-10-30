import { randomInt, randomUUID } from "node:crypto";
import type { FranchiseId, RoomPlayer, RoomState, Squad, SquadRoles, TradeOffer } from "../../shared/types";
import { FRANCHISES } from "../../shared/types";
import { IPL_PLAYERS } from "./data/iplPlayers";

export interface GameRoom extends RoomState {
  createdAt: number;
  lastActivityAt: number;
  evaluationStarted: boolean;
}

export const rooms = new Map<string, GameRoom>();
const NAME_MIN = 2;
const NAME_MAX = 18;

export function normalizeName(value: unknown): string {
  if (typeof value !== "string") throw new Error("Enter a display name between 2 and 18 characters.");
  const name = value.trim();
  if (name.length < NAME_MIN || name.length > NAME_MAX) {
    throw new Error("Display names must be between 2 and 18 characters.");
  }
  return name;
}

export function createRoom(nameInput: unknown): { room: GameRoom; playerId: string } {
  const name = normalizeName(nameInput);
  let code = "";
  do {
    code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  } while (rooms.has(code));
  const playerId = randomUUID();
  const host: RoomPlayer = { id: playerId, name, isHost: true, connected: true };
  const room: GameRoom = {
    code, phase: "lobby", hostPlayerId: playerId, players: [host], turnOrder: [],
    currentTurnIndex: 0, currentPickNumber: 0, totalPicks: 0, spinInProgress: false,
    squads: { [playerId]: emptySquad() }, pickedPlayerIds: [], createdAt: Date.now(),
    lastActivityAt: Date.now(), evaluationStarted: false
  };
  rooms.set(code, room);
  return { room, playerId };
}

export function joinRoom(codeInput: unknown, nameInput: unknown): { room: GameRoom; playerId: string } {
  const code = typeof codeInput === "string" ? codeInput.trim() : "";
  const room = rooms.get(code);
  if (!room || !/^\d{6}$/.test(code)) throw new Error("We couldn't find that room. Check the six-digit code and try again.");
  if (room.phase !== "lobby") throw new Error("This draft is already in progress, so the lobby is locked.");
  if (room.players.length >= 8) throw new Error("This room is full (maximum 8 players).");
  const name = normalizeName(nameInput);
  if (room.players.some((player) => player.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
    throw new Error("That display name is already in this room. Try another one.");
  }
  const playerId = randomUUID();
  room.players.push({ id: playerId, name, isHost: false, connected: true });
  room.squads[playerId] = emptySquad();
  touch(room);
  return { room, playerId };
}

export function getPlayer(room: GameRoom, playerId: string): RoomPlayer {
  const player = room.players.find((candidate) => candidate.id === playerId);
  if (!player) throw new Error("Your player session is no longer in this room. Rejoin to continue.");
  return player;
}

export function activePlayerId(room: GameRoom): string | undefined {
  if (!room.turnOrder.length || room.currentPickNumber >= room.totalPicks) return undefined;
  const count = room.turnOrder.length;
  const round = Math.floor(room.currentPickNumber / count);
  const position = room.currentPickNumber % count;
  return room.turnOrder[round % 2 === 0 ? position : count - 1 - position];
}

export function startDraft(room: GameRoom, playerId: string): void {
  requireHost(room, playerId);
  if (room.phase !== "lobby") throw new Error("The draft can only be started from the lobby.");
  if (room.players.length < 2 || room.players.length > 8) throw new Error("You need 2 to 8 players to start the draft.");
  if (room.players.some((player) => !player.connected)) throw new Error("Wait for every player to reconnect before starting.");
  room.turnOrder = room.players.map((player) => player.id);
  for (let i = room.turnOrder.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [room.turnOrder[i], room.turnOrder[j]] = [room.turnOrder[j], room.turnOrder[i]];
  }
  room.phase = "draft";
  room.totalPicks = room.players.length * 12;
  room.currentPickNumber = 0;
  updateTurnIndex(room);
  touch(room);
}

export function spin(room: GameRoom, playerId: string): FranchiseId {
  requireDraftTurn(room, playerId);
  if (room.spinInProgress) throw new Error("The wheel is already spinning.");
  if (room.currentSpinFranchiseId && room.spinResultAt && Date.now() - room.spinResultAt < 30_000) {
    throw new Error("Pick from the current franchise or spin again first.");
  }
  const franchise = FRANCHISES[randomInt(FRANCHISES.length)];
  room.currentSpinFranchiseId = franchise.id;
  room.spinInProgress = true;
  room.spinResultAt = undefined;
  touch(room);
  return franchise.id;
}

export function finishSpin(room: GameRoom): void {
  if (room.phase !== "draft" || !room.spinInProgress) return;
  room.spinInProgress = false;
  room.spinResultAt = Date.now();
  touch(room);
}

export function spinAgain(room: GameRoom, playerId: string): void {
  requireDraftTurn(room, playerId);
  if (room.spinInProgress || !room.currentSpinFranchiseId || !room.spinResultAt) throw new Error("Wait for the wheel result first.");
  const available = IPL_PLAYERS.some((player) => player.franchiseId === room.currentSpinFranchiseId && !room.pickedPlayerIds.includes(player.id));
  if (available) throw new Error("There are still players available from this franchise.");
  room.currentSpinFranchiseId = undefined;
  room.spinResultAt = undefined;
  touch(room);
}

export function pickPlayer(room: GameRoom, playerId: string, playerInput: unknown): void {
  requireDraftTurn(room, playerId);
  if (room.spinInProgress || !room.currentSpinFranchiseId || !room.spinResultAt) throw new Error("Wait for the wheel to reveal a franchise before picking.");
  const playerIdToPick = typeof playerInput === "string" ? playerInput : "";
  const player = IPL_PLAYERS.find((candidate) => candidate.id === playerIdToPick);
  if (!player || player.franchiseId !== room.currentSpinFranchiseId) throw new Error("Choose a player from the franchise selected by the wheel.");
  if (room.pickedPlayerIds.includes(player.id)) throw new Error("That player is already off the board.");
  if (room.pickedPlayerIds.length >= IPL_PLAYERS.length) throw new Error("The player pool is exhausted; no pick was made.");
  const squad = room.squads[playerId];
  if (!squad || squad.playerIds.length >= 12) throw new Error("This squad is already full.");
  squad.playerIds.push(player.id);
  if (squad.playerIds.length <= 11) squad.battingOrder.push(player.id);
  else squad.impactPlayerId = player.id;
  room.pickedPlayerIds.push(player.id);
  room.currentPickNumber += 1;
  room.currentSpinFranchiseId = undefined;
  room.spinResultAt = undefined;
  if (room.currentPickNumber === room.totalPicks) {
    if (room.players.some((participant) => room.squads[participant.id]?.playerIds.length !== 12)) {
      throw new Error("Draft invariant failed: every squad must contain exactly 12 players.");
    }
    room.phase = "draftComplete";
    room.currentTurnIndex = 0;
  } else {
    updateTurnIndex(room);
  }
  touch(room);
}

export function openTradeWindow(room: GameRoom, playerId: string): void {
  requireHost(room, playerId);
  if (room.phase !== "draftComplete") throw new Error("The trade window can only open after the draft.");
  room.phase = "trade";
  room.tradeNotice = undefined;
  touch(room);
}

export function proposeTrade(room: GameRoom, playerId: string, offeredInput: unknown, targetInput: unknown): TradeOffer {
  if (room.phase !== "trade") throw new Error("Trades are only available during the trade window.");
  if (room.pendingTrade) throw new Error("Another trade offer is already on the table.");
  const offeredId = typeof offeredInput === "string" ? offeredInput : "";
  const targetId = typeof targetInput === "string" ? targetInput : "";
  const offeredOwner = room.players.find((player) => room.squads[player.id]?.playerIds.includes(offeredId));
  const targetOwner = room.players.find((player) => room.squads[player.id]?.playerIds.includes(targetId));
  if (!offeredOwner || offeredOwner.id !== playerId) throw new Error("You can only offer a player from your own squad.");
  if (!targetOwner || targetOwner.id === playerId) throw new Error("Choose a player from another participant's squad.");
  const offer: TradeOffer = {
    id: randomUUID(), proposerId: playerId, offeredPlayerId: offeredId, targetPlayerId: targetId,
    targetOwnerId: targetOwner.id, createdAt: Date.now()
  };
  room.pendingTrade = offer;
  room.tradeNotice = undefined;
  touch(room);
  return offer;
}

export function resolveTrade(room: GameRoom, playerId: string, decision: "accept" | "reject"): void {
  if (room.phase !== "trade" || !room.pendingTrade) throw new Error("There is no pending trade to resolve.");
  const offer = room.pendingTrade;
  if (playerId !== offer.targetOwnerId) throw new Error("Only the owner of the target player can accept or reject this offer.");
  const proposerSquad = room.squads[offer.proposerId];
  const targetSquad = room.squads[offer.targetOwnerId];
  const offeredIndex = proposerSquad?.playerIds.indexOf(offer.offeredPlayerId) ?? -1;
  const targetIndex = targetSquad?.playerIds.indexOf(offer.targetPlayerId) ?? -1;
  if (offeredIndex < 0 || targetIndex < 0) throw new Error("One of the players has changed squads; this offer is no longer valid.");
  if (decision === "accept") {
    proposerSquad!.playerIds[offeredIndex] = offer.targetPlayerId;
    targetSquad!.playerIds[targetIndex] = offer.offeredPlayerId;
    replaceSquadPlayer(proposerSquad!, offer.offeredPlayerId, offer.targetPlayerId);
    replaceSquadPlayer(targetSquad!, offer.targetPlayerId, offer.offeredPlayerId);
    room.tradeNotice = "Trade accepted — squads updated.";
  } else {
    room.tradeNotice = "Trade rejected. No players changed squads.";
  }
  room.pendingTrade = undefined;
  touch(room);
}

export function cancelTrade(room: GameRoom, playerId: string): void {
  if (room.phase !== "trade" || !room.pendingTrade) throw new Error("There is no pending trade to cancel.");
  if (room.pendingTrade.proposerId !== playerId) throw new Error("Only the proposer can cancel this offer.");
  room.pendingTrade = undefined;
  room.tradeNotice = "Trade offer cancelled.";
  touch(room);
}

export function closeTradeWindow(room: GameRoom, playerId: string): void {
  requireHost(room, playerId);
  if (room.phase !== "trade") throw new Error("The trade window is not open.");
  if (room.pendingTrade) throw new Error("Resolve or cancel the pending trade before closing the window.");
  room.phase = "finalize";
  room.tradeNotice = undefined;
  touch(room);
}

export function reorderSquad(room: GameRoom, playerId: string, orderInput: unknown): void {
  if (room.phase !== "trade" && room.phase !== "finalize") throw new Error("Batting order can only be changed after the draft.");
  const squad = room.squads[playerId];
  if (!squad || !Array.isArray(orderInput) || orderInput.length !== 11 || new Set(orderInput).size !== 11 ||
      orderInput.some((id) => typeof id !== "string" || !squad.playerIds.includes(id) || id === squad.impactPlayerId)) {
    throw new Error("Batting order must contain each of your 11 main squad players exactly once.");
  }
  squad.battingOrder = [...orderInput] as string[];
  squad.finalized = false;
  touch(room);
}

export function updateRoles(room: GameRoom, playerId: string, input: unknown): void {
  if (room.phase !== "finalize") throw new Error("Roles can only be finalized after the trade window closes.");
  const values = input as Partial<SquadRoles> | null;
  if (!values || typeof values !== "object") throw new Error("Choose a captain, vice-captain, and wicketkeeper.");
  const squad = room.squads[playerId];
  const { captain, viceCaptain, wicketkeeper } = values;
  const mainIds = squad?.battingOrder ?? [];
  if (!squad || !captain || !viceCaptain || !wicketkeeper ||
      !mainIds.includes(captain) || !mainIds.includes(viceCaptain) || !mainIds.includes(wicketkeeper) ||
      captain === viceCaptain) {
    throw new Error("Choose all three roles from your main 11. Captain and vice-captain must be different.");
  }
  squad.roles = { captain, viceCaptain, wicketkeeper };
  squad.finalized = true;
  touch(room);
}

export function validateEvaluationStart(room: GameRoom, playerId: string): void {
  requireHost(room, playerId);
  if (room.phase !== "finalize") throw new Error("Evaluation can only start after the trade window closes.");
  if (room.evaluationStarted) throw new Error("Evaluation is already in progress.");
  if (room.players.some((player) => !room.squads[player.id]?.finalized)) throw new Error("Every participant must finalize their squad roles first.");
  room.evaluationStarted = true;
  room.phase = "evaluating";
  touch(room);
}

export function closeRoom(room: GameRoom, playerId: string): void {
  requireHost(room, playerId);
  rooms.delete(room.code);
}

export function removeLobbyPlayer(room: GameRoom, playerId: string): void {
  const index = room.players.findIndex((player) => player.id === playerId);
  if (index < 0) return;
  room.players.splice(index, 1);
  delete room.squads[playerId];
  if (!room.players.length) {
    rooms.delete(room.code);
    return;
  }
  if (room.hostPlayerId === playerId) transferHost(room);
  touch(room);
}

export function setConnected(room: GameRoom, playerId: string, connected: boolean): void {
  const player = room.players.find((candidate) => candidate.id === playerId);
  if (player) {
    player.connected = connected;
    if (room.hostPlayerId === playerId && !connected) {
      setTimeout(() => {
        const current = rooms.get(room.code);
        const host = current?.players.find((candidate) => candidate.id === playerId);
        if (current && host && !host.connected) transferHost(current);
      }, 45_000).unref();
    }
    if (!connected) {
      setTimeout(() => {
        const current = rooms.get(room.code);
        if (current === room && current.players.every((participant) => !participant.connected)) rooms.delete(room.code);
      }, 45_000).unref();
    }
    touch(room);
  }
}

export function safeSnapshot(room: GameRoom): RoomState {
  const { createdAt: _createdAt, lastActivityAt: _lastActivityAt, evaluationStarted: _evaluationStarted, ...state } = room;
  return structuredClone(state);
}

export function touch(room: GameRoom): void {
  room.lastActivityAt = Date.now();
}

function emptySquad(): Squad {
  return { playerIds: [], battingOrder: [], roles: {}, finalized: false };
}

function requireHost(room: GameRoom, playerId: string): void {
  getPlayer(room, playerId);
  if (room.hostPlayerId !== playerId) throw new Error("Only the host can do that.");
}

function requireDraftTurn(room: GameRoom, playerId: string): void {
  if (room.phase !== "draft") throw new Error("The draft is not active.");
  const activeId = activePlayerId(room);
  const active = activeId ? getPlayer(room, activeId) : undefined;
  if (playerId !== activeId && !(playerId === room.hostPlayerId && active && !active.connected)) {
    throw new Error("It isn't your turn yet.");
  }
}

function updateTurnIndex(room: GameRoom): void {
  const current = activePlayerId(room);
  room.currentTurnIndex = current ? room.turnOrder.indexOf(current) : 0;
}

function replaceSquadPlayer(squad: Squad, outgoing: string, incoming: string): void {
  const battingIndex = squad.battingOrder.indexOf(outgoing);
  if (battingIndex >= 0) squad.battingOrder[battingIndex] = incoming;
  if (squad.impactPlayerId === outgoing) squad.impactPlayerId = incoming;
  for (const role of ["captain", "viceCaptain", "wicketkeeper"] as const) {
    if (squad.roles[role] === outgoing) squad.roles[role] = incoming;
  }
  squad.finalized = false;
}

function transferHost(room: GameRoom): void {
  const next = room.players.find((player) => player.connected) ?? room.players[0];
  if (!next) return;
  room.hostPlayerId = next.id;
  for (const player of room.players) player.isHost = player.id === next.id;
  touch(room);
}
