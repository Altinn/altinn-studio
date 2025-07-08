import React from 'react';
import type { ReactElement } from 'react';
import { StudioFieldset } from '../StudioFieldset';
import type { StudioFieldsetProps } from '../StudioFieldset';

export type StudioCheckboxGroupProps = StudioFieldsetProps;

export function StudioCheckboxGroup({ children, ...rest }: StudioCheckboxGroupProps): ReactElement {
  return <StudioFieldset {...rest}>{children}</StudioFieldset>;
}
