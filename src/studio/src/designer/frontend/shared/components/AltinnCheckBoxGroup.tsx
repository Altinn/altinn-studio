import React from 'react';
import { FormGroup } from '@mui/material';

export interface IAltinnCheckBoxGroupProvidedProps {
  row: boolean;
  children: React.ReactNode;
}

export const AltinnCheckBoxGroup = ({
  row,
  children,
}: IAltinnCheckBoxGroupProvidedProps) => {
  return <FormGroup row={row}>{children}</FormGroup>;
};

export default AltinnCheckBoxGroup;
