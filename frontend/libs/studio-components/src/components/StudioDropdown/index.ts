import { StudioDropdown as Root } from './StudioDropdown';
import { StudioDropdownButton } from './StudioDropdownButton';
import { StudioDropdownFileUploaderButton } from './StudioDropdownFileUploaderButton';
import { StudioDropdownHeading } from './StudioDropdownHeading';
import { StudioDropdownList } from './StudioDropdownList';
import { StudioDropdownItem } from './StudioDropdownItem';

type StudioDropdownComponent = typeof Root & {
  Heading: typeof StudioDropdownHeading;
  List: typeof StudioDropdownList;
  Item: typeof StudioDropdownItem;
  Button: typeof StudioDropdownButton;
  FileUploaderButton: typeof StudioDropdownFileUploaderButton;
};

const StudioDropdown = Root as StudioDropdownComponent;

StudioDropdown.Heading = StudioDropdownHeading;
StudioDropdown.List = StudioDropdownList;
StudioDropdown.Item = StudioDropdownItem;
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
