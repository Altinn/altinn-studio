import React from 'react';
import { Alert, Paragraph } from '@digdir/designsystemet-react';

export type StudioErrorProps = {
  children?: React.ReactNode;
};

export const StudioError = ({ children }: StudioErrorProps) => {
  const isReactNode = React.isValidElement(children);
  return (
    <Alert severity='danger'>{isReactNode ? <Paragraph>{children}</Paragraph> : children}</Alert>
  );
};
