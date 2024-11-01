import { StudioToggleGroup as StudioToggleGroupRoot } from './StudioToggleGroup';
import { StudioToggleGroupItem } from './StudioToggleGroupItem';

type StudioToggleGroupComponent = typeof StudioToggleGroupRoot & {
  Item: typeof StudioToggleGroupItem;
};

export const StudioToggleGroup: StudioToggleGroupComponent =
  StudioToggleGroupRoot as StudioToggleGroupComponent;
StudioToggleGroup.Item = StudioToggleGroupItem;

export type { StudioToggleGroupProps } from './StudioToggleGroup';
export type { StudioToggleGroupItemProps } from './StudioToggleGroupItem';
