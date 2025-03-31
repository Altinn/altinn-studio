import React from 'react';
import type { ReactElement } from 'react';
import { Select } from '@digdir/designsystemet-react';
import type { SelectProps } from '@digdir/designsystemet-react';
import { StudioField } from '../StudioField';
import { StudioLabel } from '../StudioLabel';

export type StudioSelectProps = {
  label: string;
} & SelectProps;

export function StudioSelect({
  label,
  children,
  'data-size': dataSize = 'sm',
  ...rest
}: StudioSelectProps): ReactElement {
  return (
    <StudioField data-size={dataSize}>
      <StudioLabel>{label}</StudioLabel>
      <Select data-size={dataSize} {...rest}>
        {children}
      </Select>
    </StudioField>
  );
}
