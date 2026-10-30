import { FRANCHISES, type FranchiseId } from "../../../shared/types";

export function FranchiseBadge({ id, small = false }: { id: FranchiseId; small?: boolean }) {
  const team = FRANCHISES.find((franchise) => franchise.id === id)!;
  return (
    <span className={`franchise-badge${small ? " franchise-badge--small" : ""}`} style={{ "--team-color": team.color } as React.CSSProperties} title={team.name}>
      <span className="franchise-mark">{team.id}</span>
      {!small && <span className="franchise-name">{team.short}</span>}
    </span>
  );
}
