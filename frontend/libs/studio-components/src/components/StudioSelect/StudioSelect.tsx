import React from 'react';
import type { ReactElement } from 'react';
import classes from './StudioSelect.module.css';
import { Label, Select } from '@digdir/designsystemet-react';
import type { SelectProps } from '@digdir/designsystemet-react';
import { StudioField } from '../StudioField';

export type StudioSelectProps = {
  label: string;
} & SelectProps;

export function StudioSelect({ label, children, ...rest }: StudioSelectProps): ReactElement {
  return (
    <StudioField className={classes.field}>
      <Label>{label}</Label>
      <Select {...rest}>{children}</Select>
    </StudioField>
  );
}
