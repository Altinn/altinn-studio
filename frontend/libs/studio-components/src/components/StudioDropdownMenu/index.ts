import { StudioDropdownMenu as Root } from './StudioDropdownMenu';
import { DropdownMenuGroup } from '@digdir/design-system-react';
import { StudioDropdownMenuItem } from './StudioDropdownMenuItem';

type StudioDropdownMenuComponent = typeof Root & {
  Group: typeof DropdownMenuGroup;
  Item: typeof StudioDropdownMenuItem;
};

const StudioDropdownMenu = Root as StudioDropdownMenuComponent;

StudioDropdownMenu.Group = DropdownMenuGroup;
StudioDropdownMenu.Item = StudioDropdownMenuItem;

StudioDropdownMenu.Group.displayName = 'StudioDropdownMenu.Group';
StudioDropdownMenu.Item.displayName = 'StudioDropdownMenu.Item';

export type { StudioDropdownMenuProps } from './StudioDropdownMenu';
export type { StudioDropdownMenuItemProps } from './StudioDropdownMenuItem';
export { StudioDropdownMenu };
