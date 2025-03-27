import { StudioDropdown as Root } from './StudioDropdown';
import { DropdownHeading, DropdownList, DropdownItem } from '@digdir/designsystemet-react';
import { StudioDropdownButton } from './StudioDropdownButton';
import { StudioDropdownFileUploaderButton } from './StudioDropdownFileUploaderButton';

type StudioDropdownComponent = typeof Root & {
  Heading: typeof DropdownHeading;
  List: typeof DropdownList;
  Item: typeof DropdownItem;
  Button: typeof StudioDropdownButton;
  FileUploaderButton: typeof StudioDropdownFileUploaderButton;
};

const StudioDropdown = Root as StudioDropdownComponent;

StudioDropdown.Heading = DropdownHeading;
StudioDropdown.List = DropdownList;
StudioDropdown.Item = DropdownItem;
StudioDropdown.Button = StudioDropdownButton;
StudioDropdown.FileUploaderButton = StudioDropdownFileUploaderButton;

StudioDropdown.Heading.displayName = 'StudioDropdown.Heading';
StudioDropdown.List.displayName = 'StudioDropdown.List';
StudioDropdown.Item.displayName = 'StudioDropdown.Item';
StudioDropdown.Button.displayName = 'StudioDropdown.Button';
StudioDropdown.FileUploaderButton.displayName = 'StudioDropdown.FileUploaderButton';

export type { StudioDropdownProps } from './StudioDropdown';
export type { StudioDropdownButtonProps } from './StudioDropdownButton';

export { StudioDropdown };
