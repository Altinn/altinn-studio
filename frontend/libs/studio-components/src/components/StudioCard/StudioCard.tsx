import React, { forwardRef } from 'react';
import type { ReactElement, Ref } from 'react';
import { Card } from '@digdir/designsystemet-react';
import type { CardProps } from '@digdir/designsystemet-react';
import type { WithoutAsChild } from '../../types/WithoutAsChild';

export type StudioCardProps = WithoutAsChild<CardProps>;

function StudioCard(
  { children, ...rest }: StudioCardProps,
  ref: Ref<HTMLDivElement>,
): ReactElement {
  return (
    <Card {...rest} ref={ref}>
      {children}
    </Card>
  );
}

const ForwardedStudioCard = forwardRef(StudioCard);

export { ForwardedStudioCard as StudioCard };
