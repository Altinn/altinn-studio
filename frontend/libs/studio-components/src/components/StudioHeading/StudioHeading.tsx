import React from 'react';
import { Heading, HeadingProps } from '@digdir/designsystemet-react';

export type StudioHeadingProps = HeadingProps;

export const StudioHeading = ({
  children,
  'data-size': dataSize = 'sm',
  ...rest
}: StudioHeadingProps) => {
  return (
    <Heading {...rest} data-size={dataSize}>
      {children}
    </Heading>
  );
};
