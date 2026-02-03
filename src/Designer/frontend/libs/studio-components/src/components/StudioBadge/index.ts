import { StudioBadge as Root } from './StudioBadge';
import { Position } from './Position';

type StudioBadgeComponent = typeof Root & {
  Position: typeof Position;
};

const StudioBadge = Root as StudioBadgeComponent;

StudioBadge.Position = Position;

export type { StudioBadgeProps } from './StudioBadge';
export type { PositionProps as StudioBadgePositionProps } from './Position';
export { StudioBadge };
