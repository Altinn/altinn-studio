import React from 'react';
import type { ReactElement } from 'react';
import { StudioCheckbox } from '../StudioCheckbox';
import type { StudioGetCheckboxProps } from './StudioGetCheckboxProps';
import type { StudioCheckboxProps } from '../StudioCheckbox';

export type StudioCheckboxGroupItemProps = {
  getCheckboxProps: StudioGetCheckboxProps;
  hasError?: boolean;
} & StudioCheckboxProps;

export function StudioCheckboxGroupItem({
  getCheckboxProps,
  hasError = false,
  label,
}: StudioCheckboxGroupItemProps): ReactElement {
  return <StudioCheckbox label={label} {...getCheckboxProps} aria-invalid={hasError} />;
}
