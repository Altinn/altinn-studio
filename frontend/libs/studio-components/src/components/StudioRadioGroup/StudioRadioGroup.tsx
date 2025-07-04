import React from 'react';
import type { ReactElement, ReactNode } from 'react';
import { StudioFieldset } from '../StudioFieldset';

export type StudioRadioGroupProps = {
  children: ReactNode;
};

export function StudioRadioGroup({ children }: StudioRadioGroupProps): ReactElement {
  return <StudioFieldset>{children}</StudioFieldset>;
}
