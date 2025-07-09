import { StudioToggleGroupItem, StudioToggleGroup as Root } from './StudioToggleGroup';

type StudioToggleGroupComponent = typeof Root & {
  Item: typeof StudioToggleGroupItem;
};

const StudioToggleGroup = Root as StudioToggleGroupComponent;

StudioToggleGroup.Item = StudioToggleGroupItem;

export type { StudioToggleGroupProps } from './StudioToggleGroup';
export type { StudioToggleGroupItemProps } from './StudioToggleGroup';

export { StudioToggleGroup };
