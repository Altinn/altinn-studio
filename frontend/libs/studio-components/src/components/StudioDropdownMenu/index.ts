import { StudioDropdownMenu as Root } from './StudioDropdownMenu';
import { DropdownMenuGroup, DropdownMenuContent } from '@digdir/design-system-react';
import { StudioDropdownMenuItem } from './StudioDropdownMenuItem';

type StudioDropdownMenuComponent = typeof Root & {
  Content: typeof DropdownMenuContent;
  Group: typeof DropdownMenuGroup;
  Item: typeof StudioDropdownMenuItem;
};

const StudioDropdownMenu = Root as StudioDropdownMenuComponent;

StudioDropdownMenu.Group = DropdownMenuGroup;
StudioDropdownMenu.Item = StudioDropdownMenuItem;
StudioDropdownMenu.Content = DropdownMenuContent;

StudioDropdownMenu.Group.displayName = 'StudioDropdownMenu.Group';
StudioDropdownMenu.Item.displayName = 'StudioDropdownMenu.Item';
StudioDropdownMenu.Content.displayName = 'StudioDropdownMenu.Content';

export type { StudioDropdownMenuProps } from './StudioDropdownMenu';
export type { StudioDropdownMenuItemProps } from './StudioDropdownMenuItem';

export { StudioDropdownMenu };
