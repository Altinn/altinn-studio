import { ComboboxEmpty, ComboboxOption } from '@digdir/designsystemet-react';
import { StudioCombobox as StudioComboboxRoot } from './StudioCombobox';

type StudioComboboxComponent = typeof StudioComboboxRoot & {
  Option: typeof ComboboxOption;
  Empty: typeof ComboboxEmpty;
};
const StudioCombobox = StudioComboboxRoot as StudioComboboxComponent;

StudioCombobox.Option = ComboboxOption;
StudioCombobox.Empty = ComboboxEmpty;

StudioCombobox.Option.displayName = 'StudioCombobox.Option';
StudioCombobox.Empty.displayName = 'StudioCombobox.Empty';

export type { StudioComboboxProps } from './StudioCombobox';
export { StudioCombobox };
