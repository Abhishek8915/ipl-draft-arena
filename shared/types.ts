export const FRANCHISES = [
  { id: "CSK", name: "Chennai Super Kings", short: "Super Kings", color: "#f5c400", secondary: "#1761a0" },
  { id: "DC", name: "Delhi Capitals", short: "Capitals", color: "#e11d48", secondary: "#1d4ed8" },
  { id: "GT", name: "Gujarat Titans", short: "Titans", color: "#6d7885", secondary: "#0f172a" },
  { id: "KKR", name: "Kolkata Knight Riders", short: "Knight Riders", color: "#a855f7", secondary: "#f5c400" },
  { id: "LSG", name: "Lucknow Super Giants", short: "Super Giants", color: "#38bdf8", secondary: "#f43f5e" },
  { id: "MI", name: "Mumbai Indians", short: "Indians", color: "#2563eb", secondary: "#f97316" },
  { id: "PBKS", name: "Punjab Kings", short: "Punjab Kings", color: "#ef4444", secondary: "#d1d5db" },
  { id: "RR", name: "Rajasthan Royals", short: "Royals", color: "#ec4899", secondary: "#1d4ed8" },
  { id: "RCB", name: "Royal Challengers Bengaluru", short: "Challengers", color: "#ef4444", secondary: "#111827" },
  { id: "SRH", name: "Sunrisers Hyderabad", short: "Sunrisers", color: "#f97316", secondary: "#111827" }
] as const;

export type FranchiseId = typeof FRANCHISES[number]["id"];
export type PlayerRole = "batter" | "wicketkeeper-batter" | "all-rounder" | "bowler";
export type GamePhase = "lobby" | "draft" | "draftComplete" | "trade" | "finalize" | "evaluating" | "results";

export interface IplPlayer {
  id: string;
  name: string;
  franchiseId: FranchiseId;
  role: PlayerRole;
  nationality?: string;
  tags?: string[];
}

export interface RoomPlayer {
  id: string;
  name: string;
  isHost: boolean;
  connected: boolean;
}

export interface SquadRoles {
  captain?: string;
  viceCaptain?: string;
  wicketkeeper?: string;
}

export interface Squad {
  playerIds: string[];
  battingOrder: string[];
  impactPlayerId?: string;
  roles: SquadRoles;
  finalized: boolean;
}

export interface TradeOffer {
  id: string;
  proposerId: string;
  offeredPlayerId: string;
  targetPlayerId: string;
  targetOwnerId: string;
  createdAt: number;
}

export const EVALUATION_CRITERIA = [
  { key: "topOrderBatting", label: "Top-order batting" },
  { key: "middleOrderBatting", label: "Middle-order batting" },
  { key: "finishingAbility", label: "Finishing ability" },
  { key: "allRounders", label: "All-rounders" },
  { key: "spinBowling", label: "Spin bowling" },
  { key: "powerplayBowling", label: "Powerplay bowling" },
  { key: "deathBowling", label: "Death bowling" },
  { key: "athleticismFielding", label: "Athleticism / fielding" },
  { key: "leadershipExperience", label: "Leadership and experience" },
  { key: "teamBalanceRoleClarity", label: "Team balance and role clarity" }
] as const;

export type EvaluationCriterionKey = typeof EVALUATION_CRITERIA[number]["key"];
export type EvaluationScores = Record<EvaluationCriterionKey, { score: number; reason: string }>;

export interface EvaluatedTeam {
  playerId: string;
  teamName: string;
  scores: EvaluationScores;
  total: number;
  verdict: string;
}

export interface EvaluationResult {
  teams: EvaluatedTeam[];
  source: "gemini" | "fallback";
  note?: string;
  completedAt: number;
}

export interface RoomState {
  code: string;
  phase: GamePhase;
  hostPlayerId: string;
  players: RoomPlayer[];
  turnOrder: string[];
  currentTurnIndex: number;
  currentPickNumber: number;
  totalPicks: number;
  currentSpinFranchiseId?: FranchiseId;
  spinInProgress: boolean;
  spinResultAt?: number;
  squads: Record<string, Squad>;
  pickedPlayerIds: string[];
  pendingTrade?: TradeOffer;
  tradeNotice?: string;
  evaluation?: EvaluationResult;
}

export interface RoomError {
  message: string;
}

export interface ActionAck {
  ok: boolean;
  error?: string;
  playerId?: string;
  roomCode?: string;
}
