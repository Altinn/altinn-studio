import { StudioDropdown as Root } from './StudioDropdown';
import { DropdownHeading, DropdownList, DropdownItem } from '@digdir/designsystemet-react';
import { StudioDropdownButton } from './StudioDropdownButton';

type StudioDropdownComponent = typeof Root & {
  Heading: typeof DropdownHeading;
  List: typeof DropdownList;
  Item: typeof DropdownItem;
  Button: typeof StudioDropdownButton;
};

const StudioDropdown = Root as StudioDropdownComponent;

StudioDropdown.Heading = DropdownHeading;
StudioDropdown.List = DropdownList;
StudioDropdown.Item = DropdownItem;
StudioDropdown.Button = StudioDropdownButton;

StudioDropdown.Heading.displayName = 'StudioDropdown.Heading';
StudioDropdown.List.displayName = 'StudioDropdown.List';
StudioDropdown.Item.displayName = 'StudioDropdown.Item';
StudioDropdown.Button.displayName = 'StudioDropdown.Button';

export type { StudioDropdownProps } from './StudioDropdown';
export type { StudioDropdownButtonProps } from './StudioDropdownButton';

export { StudioDropdown };
