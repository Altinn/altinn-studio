import React, { isValidElement } from 'react';
import type { ReactElement, ReactNode } from 'react';
import classes from './StudioPageError.module.css';
import { StudioError } from '../StudioError';
import { StudioHeading } from '../StudioHeading';
import { StudioParagraph } from '../StudioParagraph';

export type StudioPageErrorProps = {
  title?: string;
  message?: string | ReactNode;
};

export function StudioPageError({ message, title }: StudioPageErrorProps): ReactElement {
  const isReactNode = isValidElement(message);

  return (
    <div className={classes.container}>
      <StudioError>
        {title && (
          <StudioHeading level={1} data-size='xs' spacing>
            {title}
          </StudioHeading>
        )}
        {isReactNode ? <>{message}</> : <StudioParagraph>{message}</StudioParagraph>}
      </StudioError>
    </div>
  );
}
