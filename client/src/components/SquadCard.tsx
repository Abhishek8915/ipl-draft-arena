import type { PointerEvent as ReactPointerEvent } from "react";
import { useRef } from "react";
import type { IplPlayer, RoomPlayer, Squad } from "../../../shared/types";
import { FranchiseBadge } from "./FranchiseBadge";

interface Props {
  owner: RoomPlayer;
  squad: Squad;
  playersById: Map<string, IplPlayer>;
  isMine: boolean;
  editable: boolean;
  onReorder: (playerIds: string[]) => void;
}

export default function SquadCard({ owner, squad, playersById, isMine, editable, onReorder }: Props) {
  const dragIndex = useRef<number | null>(null);
  const move = (from: number, to: number) => {
    if (to < 0 || to >= squad.battingOrder.length || from === to) return;
    const next = [...squad.battingOrder];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onReorder(next);
  };
  const onPointerUp = (event: ReactPointerEvent<HTMLLIElement>) => {
    const from = dragIndex.current;
    dragIndex.current = null;
    if (from === null) return;
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-order-index]");
    if (target) move(from, Number(target.dataset.orderIndex));
  };

  return (
    <article className={`squad-card${isMine ? " squad-card--mine" : ""}`}>
      <header className="squad-card__header">
        <div><span className="eyebrow">{owner.isHost ? "HOST · " : ""}{isMine ? "YOUR SQUAD" : "SQUAD"}</span><h3>{owner.name}</h3></div>
        <span className={`connection-dot${owner.connected ? "" : " connection-dot--offline"}`} title={owner.connected ? "Connected" : "Disconnected"} />
      </header>
      <div className="squad-card__meta"><span>{squad.playerIds.length} / 12 players</span>{squad.finalized && <span className="tag tag--green">Roles locked</span>}</div>
      {squad.battingOrder.length > 0 ? (
        <ol className="batting-list">
          {squad.battingOrder.map((id, index) => {
            const player = playersById.get(id);
            return (
              <li key={id} data-order-index={index} className="batting-row"
                draggable={editable}
                onDragStart={() => { dragIndex.current = index; }}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => { if (dragIndex.current !== null) move(dragIndex.current, index); dragIndex.current = null; }}
                onPointerDown={(event) => { if (editable && event.pointerType === "touch") dragIndex.current = index; }}
                onPointerUp={onPointerUp}>
                <span className="order-number">{index + 1}</span>
                <span className="batting-row__name">{player?.name ?? "Unknown player"}</span>
                {player && <FranchiseBadge id={player.franchiseId} small />}
                {editable && <span className="order-actions">
                  <button type="button" className="icon-button" aria-label={`Move ${player?.name} up`} disabled={index === 0} onClick={() => move(index, index - 1)}>↑</button>
                  <button type="button" className="icon-button" aria-label={`Move ${player?.name} down`} disabled={index === squad.battingOrder.length - 1} onClick={() => move(index, index + 1)}>↓</button>
                </span>}
              </li>
            );
          })}
        </ol>
      ) : <p className="empty-note">Players appear here as the draft unfolds.</p>}
      {squad.impactPlayerId && (
        <div className="impact-slot">
          <span className="impact-slot__number">12</span><span className="impact-slot__label">IMPACT PLAYER</span>
          <strong>{playersById.get(squad.impactPlayerId)?.name}</strong>
          {playersById.get(squad.impactPlayerId) && <FranchiseBadge id={playersById.get(squad.impactPlayerId)!.franchiseId} small />}
        </div>
      )}
      {squad.roles.captain && <div className="role-summary"><span>Ⓒ {playersById.get(squad.roles.captain)?.name}</span><span>VC {playersById.get(squad.roles.viceCaptain!)?.name}</span><span>WK {playersById.get(squad.roles.wicketkeeper!)?.name}</span></div>}
    </article>
  );
}
