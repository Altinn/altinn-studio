import React from 'react';
import { Alert, Heading, Paragraph } from '@digdir/designsystemet-react';
import classes from './StudioPageError.module.css';

export type StudioPageErrorProps = {
  title?: string;
  message?: string;
};

export const StudioPageError = ({ message, title }: StudioPageErrorProps) => {
  return (
    <div className={classes.container}>
      <Alert className={classes.alertContent} severity='danger'>
        <Heading level={1} size='xs' spacing>
          {title}
        </Heading>
        <Paragraph>{message}</Paragraph>
      </Alert>
    </div>
  );
};
