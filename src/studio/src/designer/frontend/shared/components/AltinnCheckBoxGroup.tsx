import { FormGroup } from '@material-ui/core';
import React from 'react';

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
