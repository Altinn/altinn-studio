import React from 'react';
import type { ReactElement } from 'react';
import { Divider } from '@digdir/designsystemet-react';
import type { DividerProps } from '@digdir/designsystemet-react';
import type { WithoutAsChild } from '../../types/WithoutAsChild';

export type StudioDividerProps = WithoutAsChild<DividerProps>;

export function StudioDivider({ children, ...rest }: StudioDividerProps): ReactElement {
  return <Divider {...rest} />;
}
