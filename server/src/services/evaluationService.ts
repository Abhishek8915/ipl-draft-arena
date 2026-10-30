import { GoogleGenAI } from "@google/genai";
import type { EvaluationCriterionKey, EvaluationResult, EvaluatedTeam, Squad } from "../../../shared/types";
import { EVALUATION_CRITERIA } from "../../../shared/types";
import { IPL_PLAYERS } from "../data/iplPlayers";
import type { GameRoom } from "../gameEngine";

const MODEL = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
type ModelTeam = Omit<EvaluatedTeam, "total">;

export async function evaluateRoom(room: GameRoom): Promise<EvaluationResult> {
  if (!process.env.GEMINI_API_KEY?.trim()) return fallbackResult(room, "Gemini API key is not configured.");
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const prompt = buildPrompt(room);
    let response: unknown;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const generated = await withTimeout(ai.models.generateContent({
        model: MODEL,
        contents: prompt,
        config: { responseMimeType: "application/json" }
      }), 45_000);
      const text = generated.text;
      if (!text) throw new Error("Gemini returned an empty response.");
      try {
        response = JSON.parse(text);
        return { teams: validateTeams(response, room), source: "gemini", completedAt: Date.now() };
      } catch (error) {
        if (attempt === 1) throw error;
      }
    }
    throw new Error("Gemini response could not be validated.");
  } catch (error) {
    console.error("Squad evaluation used the fallback scorecard:", error instanceof Error ? error.message : "Unknown evaluation error");
    return fallbackResult(room, "AI unavailable — using backup scorecard.");
  }
}

export function fallbackResult(room: GameRoom, note = "AI unavailable — using backup scorecard."): EvaluationResult {
  const teams = room.players.map((participant) => {
    const squad = room.squads[participant.id];
    const players = squad.playerIds.map((id) => IPL_PLAYERS.find((player) => player.id === id)).filter((player) => player !== undefined);
    const roleCount = (role: string) => players.filter((player) => player.role === role).length;
    const allRounders = roleCount("all-rounder");
    const bowlers = roleCount("bowler");
    const batters = roleCount("batter") + roleCount("wicketkeeper-batter");
    const scores = Object.fromEntries(EVALUATION_CRITERIA.map(({ key, label }) => {
      const score = fallbackScore(key, { allRounders, bowlers, batters, squad });
      return [key, { score, reason: `${label} balance based on the squad's listed roles and selections.` }];
    })) as ModelTeam["scores"];
    return {
      playerId: participant.id,
      teamName: participant.name,
      scores,
      total: totalScore(scores),
      verdict: `${participant.name}'s XI brings a lively mix of proven names and draft-day ambition.`
    };
  });
  return { teams, source: "fallback", note, completedAt: Date.now() };
}

function fallbackScore(key: EvaluationCriterionKey, counts: { allRounders: number; bowlers: number; batters: number; squad: Squad }): number {
  const batting = counts.batters;
  const bowling = counts.bowlers + counts.allRounders;
  const ideal = (value: number, target: number, tolerance: number) => Math.max(4, Math.min(9, Math.round(9 - Math.abs(value - target) * tolerance)));
  const bases: Record<EvaluationCriterionKey, number> = {
    topOrderBatting: ideal(batting, 5, 0.8),
    middleOrderBatting: ideal(batting, 5, 0.7),
    finishingAbility: ideal(counts.allRounders, 3, 0.9),
    allRounders: ideal(counts.allRounders, 3, 1.1),
    spinBowling: ideal(bowling, 5, 0.45),
    powerplayBowling: ideal(counts.bowlers, 4, 0.7),
    deathBowling: ideal(counts.bowlers, 4, 0.7),
    athleticismFielding: ideal(batting + counts.allRounders, 8, 0.35),
    leadershipExperience: 6 + Number(Boolean(counts.squad.roles.captain)) + Number(Boolean(counts.squad.roles.viceCaptain)),
    teamBalanceRoleClarity: ideal(bowling + batting, 11, 0.2)
  };
  return Math.min(10, Math.max(0, bases[key]));
}

function buildPrompt(room: GameRoom): string {
  const teams = room.players.map((participant) => {
    const squad = room.squads[participant.id];
    const describe = (id: string) => {
      const player = IPL_PLAYERS.find((entry) => entry.id === id);
      return player ? { id, name: player.name, role: player.role, franchise: player.franchiseId } : { id, name: "Unknown", role: "unknown" };
    };
    return {
      playerId: participant.id,
      teamName: participant.name,
      mainSquad: squad.battingOrder.map(describe),
      impactPlayer: squad.impactPlayerId ? describe(squad.impactPlayerId) : null,
      roles: {
        captain: squad.roles.captain ? describe(squad.roles.captain) : null,
        viceCaptain: squad.roles.viceCaptain ? describe(squad.roles.viceCaptain) : null,
        wicketkeeper: squad.roles.wicketkeeper ? describe(squad.roles.wicketkeeper) : null
      }
    };
  });
  const schema = {
    teams: teams.map((team) => ({
      playerId: team.playerId, teamName: team.teamName,
      scores: Object.fromEntries(EVALUATION_CRITERIA.map(({ key }) => [key, { score: "integer 0..10", reason: "short reason" }])),
      verdict: "fun verdict, no more than 35 words"
    }))
  };
  return [
    "You are an entertaining IPL fantasy squad analyst. This is a subjective game, not a prediction.",
    "Score every team on the exact ten criteria below using integer scores 0-10. Apply consistent standards without favoring the host.",
    "Use only the supplied squads and known player roles. Do not invent, add, remove, or rename players. Do not claim live form or predict match outcomes.",
    "Return JSON only with shape { teams: [...] }. Include exactly one team per supplied playerId, the exact supplied teamName, exactly these score keys, and a short reason for every score. Keep each verdict to 35 words maximum.",
    `Criteria: ${EVALUATION_CRITERIA.map(({ key }) => key).join(", ")}.`,
    `Schema example: ${JSON.stringify(schema)}`,
    `Squads: ${JSON.stringify(teams)}`
  ].join("\n");
}

function validateTeams(input: unknown, room: GameRoom): EvaluatedTeam[] {
  if (!input || typeof input !== "object" || Object.keys(input).join("|") !== "teams" ||
      !Array.isArray((input as { teams?: unknown }).teams)) throw new Error("Evaluation JSON is missing its teams array.");
  const received = (input as { teams: unknown[] }).teams;
  if (received.length !== room.players.length) throw new Error("Evaluation returned the wrong number of teams.");
  const expected = new Map(room.players.map((player) => [player.id, player.name]));
  const seen = new Set<string>();
  const criteriaKeys = EVALUATION_CRITERIA.map(({ key }) => key).sort();
  return received.map((raw) => {
    if (!raw || typeof raw !== "object") throw new Error("Evaluation team entry is invalid.");
    const team = raw as Record<string, unknown>;
    if (Object.keys(team).sort().join("|") !== ["playerId", "teamName", "scores", "verdict"].sort().join("|")) {
      throw new Error("Evaluation team entry contains unexpected fields.");
    }
    if (typeof team.playerId !== "string" || !expected.has(team.playerId) || seen.has(team.playerId)) throw new Error("Evaluation returned an unknown or duplicate team.");
    if (team.teamName !== expected.get(team.playerId)) throw new Error("Evaluation changed a participant name.");
    if (!team.scores || typeof team.scores !== "object" || Array.isArray(team.scores)) throw new Error("Evaluation scores are invalid.");
    const rawScores = team.scores as Record<string, unknown>;
    if (Object.keys(rawScores).sort().join("|") !== criteriaKeys.join("|")) throw new Error("Evaluation criteria do not match the required scorecard.");
    const scores = {} as ModelTeam["scores"];
    for (const { key } of EVALUATION_CRITERIA) {
      const item = rawScores[key];
      if (!item || typeof item !== "object") throw new Error(`Evaluation criterion ${key} is invalid.`);
      const entry = item as Record<string, unknown>;
      if (Object.keys(entry).sort().join("|") !== "reason|score") throw new Error(`Evaluation criterion ${key} contains unexpected fields.`);
      if (!Number.isInteger(entry.score) || (entry.score as number) < 0 || (entry.score as number) > 10 || typeof entry.reason !== "string") {
        throw new Error(`Evaluation score for ${key} is invalid.`);
      }
      if (!entry.reason.trim()) throw new Error(`Evaluation reason for ${key} is empty.`);
      scores[key] = { score: entry.score as number, reason: entry.reason.slice(0, 240) };
    }
    if (typeof team.verdict !== "string") throw new Error("Evaluation verdict is missing.");
    const verdict = team.verdict.trim();
    if (!verdict || verdict.split(/\s+/).length > 35) throw new Error("Evaluation verdict must be no more than 35 words.");
    seen.add(team.playerId);
    return {
      playerId: team.playerId, teamName: expected.get(team.playerId)!, scores,
      total: totalScore(scores), verdict
    };
  });
}

function totalScore(scores: ModelTeam["scores"]): number {
  return EVALUATION_CRITERIA.reduce((total, { key }) => total + scores[key].score, 0);
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Gemini evaluation timed out.")), timeoutMs);
    promise.then(resolve, reject).finally(() => clearTimeout(timer));
  });
}
