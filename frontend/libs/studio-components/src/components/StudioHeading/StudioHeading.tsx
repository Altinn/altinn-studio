import React from 'react';
import type { ReactElement } from 'react';
import { Heading, type HeadingProps } from '@digdir/designsystemet-react';
import type { WithoutAsChild } from '../../types/WithoutAsChild';

export type StudioHeadingProps = WithoutAsChild<HeadingProps>;

export function StudioHeading({
  children,
  'data-size': dataSize = 'sm',
  ...rest
}: StudioHeadingProps): ReactElement {
  return (
    <Heading {...rest} data-size={dataSize}>
      {children}
    </Heading>
  );
}
