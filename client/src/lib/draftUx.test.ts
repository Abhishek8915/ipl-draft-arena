import assert from "node:assert/strict";
import { test } from "node:test";
import { FRANCHISES } from "../../../shared/types";
import { IPL_PLAYERS } from "../../../shared/iplPlayers";
import { getEligibleDraftPlayers } from "./draftPool";
import { wheelLabelAngle, wheelSpinRotation } from "./wheelGeometry";

test("wheel rotation lands the selected segment center at the pointer across repeated spins", () => {
  let rotation = 0;
  for (let spin = 0; spin < FRANCHISES.length * 3; spin += 1) {
    const index = spin % FRANCHISES.length;
    rotation += wheelSpinRotation(index, rotation);
    const pointerAngle = ((rotation + wheelLabelAngle(index)) % 360 + 360) % 360;
    assert.ok(pointerAngle < 1e-8 || 360 - pointerAngle < 1e-8, `${FRANCHISES[index].id} landed at ${pointerAngle}°`);
  }
});

test("draft player list contains only unpicked players from the server-selected franchise", () => {
  for (const franchise of FRANCHISES) {
    const players = IPL_PLAYERS.filter((player) => player.franchiseId === franchise.id);
    const pickedIds = [players[0].id];
    const eligible = getEligibleDraftPlayers(IPL_PLAYERS, pickedIds, franchise.id, "");
    assert.ok(eligible.length > 0);
    assert.ok(eligible.every((player) => player.franchiseId === franchise.id));
    assert.ok(eligible.every((player) => !pickedIds.includes(player.id)));
    assert.equal(getEligibleDraftPlayers(IPL_PLAYERS, pickedIds, undefined, "").length, 0);
  }
});
