import React, { forwardRef } from 'react';
import type { ReactElement, Ref } from 'react';
import { Card } from '@digdir/designsystemet-react';
import type { CardProps } from '@digdir/designsystemet-react';
import type { WithoutAsChild } from '../../types/WithoutAsChild';
import classes from './StudioCard.module.css';

export type StudioCardProps = WithoutAsChild<CardProps>;

function StudioCard(
  { children, ...rest }: StudioCardProps,
  ref: Ref<HTMLDivElement>,
): ReactElement {
  const mergedClasses = `${classes.cardWrapper} ${rest.className ?? ''}`;

  return (
    <Card {...rest} ref={ref} className={mergedClasses}>
      {children}
    </Card>
  );
}

const ForwardedStudioCard = forwardRef(StudioCard);

export { ForwardedStudioCard as StudioCard };
