import React from 'react';
import type { ReactElement } from 'react';
import { StudioRadio } from '../StudioRadio';
import type { StudioGetRadioProps } from './StudioGetRadioProps';
import type { StudioRadioProps } from '../StudioRadio';

export type StudioRadioGroupItemProps = {
  getRadioProps: StudioGetRadioProps;
  hasError?: boolean;
} & StudioRadioProps;

export function StudioRadioGroupItem({
  getRadioProps,
  hasError = false,
  label,
}: StudioRadioGroupItemProps): ReactElement {
  return <StudioRadio label={label} {...getRadioProps} aria-invalid={hasError} />;
}
