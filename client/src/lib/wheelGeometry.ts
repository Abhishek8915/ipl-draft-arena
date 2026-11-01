import { FRANCHISES } from "../../../shared/types";

export const WHEEL_SEGMENT_ANGLE = 360 / FRANCHISES.length;

export function wheelLabelAngle(index: number): number {
  return (index + 0.5) * WHEEL_SEGMENT_ANGLE;
}

export function wheelSpinRotation(index: number, currentRotation: number): number {
  const targetAngle = (360 - wheelLabelAngle(index)) % 360;
  const currentAngle = ((currentRotation % 360) + 360) % 360;
  const alignment = (targetAngle - currentAngle + 360) % 360;
  return 4 * 360 + alignment;
}
