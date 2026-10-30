import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import {
  activePlayerId, closeTradeWindow, createRoom, finishSpin, joinRoom, openTradeWindow, pickPlayer,
  proposeTrade, resolveTrade, rooms, spin, spinAgain, startDraft, updateRoles, validateEvaluationStart
} from "./gameEngine";
import { IPL_PLAYERS } from "./data/iplPlayers";
import { EVALUATION_CRITERIA } from "../../shared/types";
import { evaluateRoom, fallbackResult } from "./services/evaluationService";

afterEach(() => rooms.clear());

test("room names, codes, capacity, and live join constraints are enforced", () => {
  const { room, playerId } = createRoom("  Captain  ");
  assert.match(room.code, /^\d{6}$/);
  assert.equal(room.players[0].name, "Captain");
  assert.throws(() => joinRoom(room.code, "captain"), /already in this room/);
  for (let index = 1; index < 8; index += 1) joinRoom(room.code, `Player ${index}`);
  assert.equal(room.players.length, 8);
  assert.throws(() => joinRoom(room.code, "Ninth"), /full/);
  room.players[1].connected = false;
  assert.throws(() => startDraft(room, playerId), /reconnect/);
  room.players.forEach((player) => { player.connected = true; });
  startDraft(room, playerId);
  assert.throws(() => joinRoom(room.code, "Late"), /already in progress/);
});

test("eight-player snake draft creates 96 unique picks and exact squad sizes", () => {
  assert.equal(IPL_PLAYERS.length, 250);
  assert.equal(new Set(IPL_PLAYERS.map((player) => player.id)).size, IPL_PLAYERS.length);
  const { room, playerId } = createRoom("Host");
  for (let index = 1; index < 8; index += 1) joinRoom(room.code, `Player ${index}`);
  startDraft(room, playerId);
  room.turnOrder = room.players.map((player) => player.id);

  for (let pick = 0; pick < 96; pick += 1) {
    const activeId = activePlayerId(room)!;
    const next = IPL_PLAYERS.find((player) => !room.pickedPlayerIds.includes(player.id))!;
    room.currentSpinFranchiseId = next.franchiseId;
    room.spinResultAt = Date.now();
    pickPlayer(room, activeId, next.id);
  }

  assert.equal(room.phase, "draftComplete");
  assert.equal(room.pickedPlayerIds.length, 96);
  assert.equal(new Set(room.pickedPlayerIds).size, 96);
  for (const player of room.players) {
    assert.equal(room.squads[player.id].playerIds.length, 12);
    assert.equal(room.squads[player.id].battingOrder.length, 11);
    assert.ok(room.squads[player.id].impactPlayerId);
  }
});

test("October 2026 roster contains 25 unique players per franchise and confirmed trades", () => {
  const counts = new Map<string, number>();
  const names = new Set<string>();
  for (const player of IPL_PLAYERS) {
    counts.set(player.franchiseId, (counts.get(player.franchiseId) ?? 0) + 1);
    assert.ok(!names.has(player.name.toLocaleLowerCase()), `Duplicate player: ${player.name}`);
    names.add(player.name.toLocaleLowerCase());
  }
  assert.equal(counts.size, 10);
  for (const count of counts.values()) assert.equal(count, 25);
  assert.equal(IPL_PLAYERS.find((player) => player.name === "Rishabh Pant")?.franchiseId, "DC");
  assert.equal(IPL_PLAYERS.find((player) => player.name === "Kuldeep Yadav")?.franchiseId, "LSG");
  assert.equal(IPL_PLAYERS.find((player) => player.name === "T. Natarajan")?.franchiseId, "SRH");
  assert.equal(IPL_PLAYERS.find((player) => player.name === "Zeeshan Ansari")?.franchiseId, "DC");
  assert.equal(IPL_PLAYERS.find((player) => player.name === "Rishabh Pant")?.id, "lsg-rishabh");
  assert.equal(IPL_PLAYERS.find((player) => player.name === "Kuldeep Yadav")?.id, "dc-kuldeep");
  assert.equal(IPL_PLAYERS.find((player) => player.name === "Ravindra Jadeja")?.id, "csk-ravindra");
});

test("wheel spins are guarded and depleted franchises can be retried", () => {
  const { room, playerId } = createRoom("Host");
  const { playerId: guestId } = joinRoom(room.code, "Guest");
  startDraft(room, playerId);
  const currentPlayer = activePlayerId(room)!;
  const franchiseId = spin(room, currentPlayer);
  assert.equal(room.currentSpinFranchiseId, franchiseId);
  assert.equal(room.spinInProgress, true);
  assert.throws(() => spin(room, currentPlayer), /already spinning/);
  finishSpin(room);
  room.pickedPlayerIds = IPL_PLAYERS.filter((player) => player.franchiseId === franchiseId).map((player) => player.id);
  spinAgain(room, currentPlayer);
  assert.equal(room.currentSpinFranchiseId, undefined);
  assert.equal(room.currentPickNumber, 0);
  assert.ok(room.players.some((player) => player.id === guestId));
});

test("trade swaps ownership atomically and roles gate evaluation", () => {
  const { room, playerId: hostId } = createRoom("Host");
  const { playerId: guestId } = joinRoom(room.code, "Guest");
  startDraft(room, hostId);
  room.turnOrder = [hostId, guestId];
  for (let pick = 0; pick < 24; pick += 1) {
    const activeId = activePlayerId(room)!;
    const next = IPL_PLAYERS.find((player) => !room.pickedPlayerIds.includes(player.id))!;
    room.currentSpinFranchiseId = next.franchiseId;
    room.spinResultAt = Date.now();
    pickPlayer(room, activeId, next.id);
  }
  openTradeWindow(room, hostId);
  const offered = room.squads[hostId].playerIds[0];
  const target = room.squads[guestId].playerIds[0];
  proposeTrade(room, hostId, offered, target);
  assert.throws(() => resolveTrade(room, hostId, "accept"), /target player/);
  resolveTrade(room, guestId, "accept");
  assert.ok(room.squads[hostId].playerIds.includes(target));
  assert.ok(room.squads[guestId].playerIds.includes(offered));
  assert.equal(room.squads[hostId].playerIds.length, 12);
  assert.equal(room.squads[guestId].playerIds.length, 12);

  closeTradeWindow(room, hostId);
  for (const participant of room.players) {
    const order = room.squads[participant.id].battingOrder;
    updateRoles(room, participant.id, { captain: order[0], viceCaptain: order[1], wicketkeeper: order[2] });
  }
  validateEvaluationStart(room, hostId);
  assert.equal(room.phase, "evaluating");
});

test("fallback scorecard returns ten categories and server-calculated totals", () => {
  const { room, playerId } = createRoom("Host");
  const playerIds = IPL_PLAYERS.slice(0, 12).map((player) => player.id);
  room.squads[playerId].playerIds = playerIds;
  room.squads[playerId].battingOrder = playerIds.slice(0, 11);
  room.squads[playerId].impactPlayerId = playerIds[11];
  room.squads[playerId].roles = { captain: playerIds[0], viceCaptain: playerIds[1], wicketkeeper: playerIds[2] };
  const result = fallbackResult(room);
  const team = result.teams[0];
  assert.equal(result.source, "fallback");
  assert.match(result.note ?? "", /backup scorecard/);
  assert.equal(Object.keys(team.scores).length, EVALUATION_CRITERIA.length);
  assert.equal(team.total, EVALUATION_CRITERIA.reduce((sum, { key }) => sum + team.scores[key].score, 0));
  assert.ok(team.total >= 0 && team.total <= 100);
});

test("evaluation completes with the backup scorecard when no Gemini key is set", async () => {
  const { room, playerId } = createRoom("Host");
  const playerIds = IPL_PLAYERS.slice(0, 12).map((player) => player.id);
  room.squads[playerId].playerIds = playerIds;
  room.squads[playerId].battingOrder = playerIds.slice(0, 11);
  room.squads[playerId].impactPlayerId = playerIds[11];
  room.squads[playerId].roles = { captain: playerIds[0], viceCaptain: playerIds[1], wicketkeeper: playerIds[2] };
  const originalKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  try {
    const result = await evaluateRoom(room);
    assert.equal(result.source, "fallback");
    assert.equal(result.note, "Gemini API key is not configured.");
  } finally {
    if (originalKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = originalKey;
  }
});
