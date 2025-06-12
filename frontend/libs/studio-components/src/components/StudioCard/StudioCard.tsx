import React from 'react';
import type { ReactElement } from 'react';
import { Card } from '@digdir/designsystemet-react';
import type { CardProps } from '@digdir/designsystemet-react';
import type { WithoutAsChild } from '../../types/WithoutAsChild';

export type StudioCardProps = WithoutAsChild<CardProps>;

export function StudioCard({ children, ...rest }: StudioCardProps): ReactElement {
  return <Card {...rest}>{children}</Card>;
}
