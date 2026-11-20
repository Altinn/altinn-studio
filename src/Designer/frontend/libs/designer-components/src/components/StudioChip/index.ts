import { StudioChipButton } from './StudioChipButton';
import { StudioChipCheckbox } from './StudioChipCheckbox';
import { StudioChipRadio } from './StudioChipRadio';
import { StudioChipRemovable } from './StudioChipRemovable';

type StudioChipComponent = {
  Button: typeof StudioChipButton;
  Checkbox: typeof StudioChipCheckbox;
  Radio: typeof StudioChipRadio;
  Removable: typeof StudioChipRemovable;
};

export const StudioChip: StudioChipComponent = {
  Button: StudioChipButton,
  Checkbox: StudioChipCheckbox,
  Radio: StudioChipRadio,
  Removable: StudioChipRemovable,
};

export type { StudioChipButtonProps } from './StudioChipButton';
export type { StudioChipCheckboxProps } from './StudioChipCheckbox';
export type { StudioChipRadioProps } from './StudioChipRadio';
export type { StudioChipRemovableProps } from './StudioChipRemovable';
