import type { FranchiseId, IplPlayer } from "../../../shared/types";

export function getEligibleDraftPlayers(
  players: readonly IplPlayer[],
  pickedPlayerIds: readonly string[],
  franchiseId: FranchiseId | undefined,
  search: string
): IplPlayer[] {
  if (!franchiseId) return [];
  const picked = new Set(pickedPlayerIds);
  const query = search.trim().toLocaleLowerCase();
  return players.filter((player) =>
    player.franchiseId === franchiseId &&
    !picked.has(player.id) &&
    player.name.toLocaleLowerCase().includes(query)
  );
}
