import { StudioCheckbox as StudioCheckboxRoot } from './StudioCheckbox';
import type { Checkbox } from '@digdir/designsystemet-react';
import { StudioCheckboxGroup } from './StudioCheckboxGroup';

type StudioCheckboxComponent = typeof Checkbox;

/**
 * @deprecated use `StudioCheckbox` from `@studio/components` instead
 */
export const StudioCheckbox: StudioCheckboxComponent =
  StudioCheckboxRoot as StudioCheckboxComponent;

StudioCheckbox.Group = StudioCheckboxGroup;

export type { StudioCheckboxProps } from './StudioCheckbox';
export type { StudioCheckboxGroupProps } from './StudioCheckboxGroup';
