import { StudioCheckbox as StudioCheckboxRoot } from './StudioCheckbox';
import { Checkbox } from '@digdir/designsystemet-react';

type StudioCheckboxComponent = typeof StudioCheckboxRoot & {
  Group: typeof Checkbox.Group;
};

export const StudioCheckbox = StudioCheckboxRoot as StudioCheckboxComponent;

StudioCheckbox.Group = Checkbox.Group;

StudioCheckbox.displayName = 'StudioCheckbox';
StudioCheckbox.Group.displayName = 'StudioCheckbox.Group';

export type { StudioCheckboxProps } from './StudioCheckbox';
