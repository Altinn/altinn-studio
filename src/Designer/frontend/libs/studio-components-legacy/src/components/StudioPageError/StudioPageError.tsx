import React from 'react';
import { Heading, Paragraph } from '@digdir/designsystemet-react';
import classes from './StudioPageError.module.css';
import { StudioError } from '../StudioError';

export type StudioPageErrorProps = {
  title?: string;
  message?: string | React.ReactNode;
};

/**
 * @deprecated Use `StudioPageError` from `@studio/components` instead.
 */
export const StudioPageError = ({ message, title }: StudioPageErrorProps) => {
  const isReactNode = React.isValidElement(message);

  return (
    <div className={classes.container}>
      <StudioError>
        {title && (
          <Heading level={1} size='xs' spacing>
            {title}
          </Heading>
        )}
        {isReactNode ? <>{message}</> : <Paragraph>{message}</Paragraph>}
      </StudioError>
    </div>
  );
};
