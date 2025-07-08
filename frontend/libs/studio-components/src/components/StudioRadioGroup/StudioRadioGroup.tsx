import React from 'react';
import type { ReactElement } from 'react';
import { StudioFieldset } from '../StudioFieldset';
import type { StudioFieldsetProps } from '../StudioFieldset';

export type StudioRadioGroupProps = StudioFieldsetProps;

export function StudioRadioGroup({ children, ...rest }: StudioRadioGroupProps): ReactElement {
  return <StudioFieldset {...rest}>{children}</StudioFieldset>;
}
