import { useEffect, useRef, useState } from "react";
import { FRANCHISES, type FranchiseId } from "../../../shared/types";
import { wheelLabelAngle, wheelSpinRotation } from "../lib/wheelGeometry";

export default function Wheel({ selected, spinning }: { selected?: FranchiseId; spinning: boolean }) {
  const [rotation, setRotation] = useState(0);
  const lastResult = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!selected || !spinning || lastResult.current === selected) return;
    const index = FRANCHISES.findIndex((franchise) => franchise.id === selected);
    setRotation((current) => current + wheelSpinRotation(index, current));
    lastResult.current = selected;
  }, [selected, spinning]);

  useEffect(() => {
    if (!spinning && !selected) lastResult.current = undefined;
  }, [selected, spinning]);

  return (
    <div className={`wheel-shell${spinning ? " wheel-shell--spinning" : ""}`} aria-label={selected ? `Wheel selected ${selected}` : "Franchise draft wheel"}>
      <div className="wheel-pointer" aria-hidden="true">▼</div>
      <div className="wheel" style={{ transform: `rotate(${rotation}deg)` }}>
        <div className="wheel-disc">
          {FRANCHISES.map((team, index) => (
            <div className="wheel-label" key={team.id} style={{ "--wheel-angle": `${wheelLabelAngle(index)}deg`, "--team-color": team.color } as React.CSSProperties}>
              <span>{team.id}</span>
            </div>
          ))}
          <div className="wheel-hub"><span>IPL</span><small>DRAFT</small></div>
        </div>
      </div>
    </div>
  );
}
