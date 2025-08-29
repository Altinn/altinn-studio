import React from 'react';
import type { ReactElement } from 'react';
import { Heading, type HeadingProps } from '@digdir/designsystemet-react';
import type { WithoutAsChild } from '../../types/WithoutAsChild';
import classes from './StudioHeading.module.css';
import cn from 'classnames';

export type StudioHeadingProps = WithoutAsChild<HeadingProps> & {
  spacing?: boolean;
};

export function StudioHeading({
  children,
  spacing = false,
  ...rest
}: StudioHeadingProps): ReactElement {
  const className = cn(rest.className, { [classes.spacing]: spacing });

  return (
    <Heading {...rest} className={className}>
      {children}
    </Heading>
  );
}
