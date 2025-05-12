import React from 'react';
import type { HTMLAttributes, ReactElement, ReactNode } from 'react';
import classes from './StudioLabelWrapper.module.css';
import { StudioTag } from '../StudioTag';

type StudioLabelWrapperProps = {
  children: ReactNode;
  requiredText?: string;
  required?: boolean;
};
export function StudioLabelWrapper({
  children,
  requiredText,
  required,
}: StudioLabelWrapperProps): ReactElement {
  return (
    <RequiredWrapper required={required} requiredText={requiredText}>
      {children}
    </RequiredWrapper>
  );
}

type RequiredWrapperProps = HTMLAttributes<HTMLSpanElement> & {
  requiredText?: string;
  required?: boolean;
};

function RequiredWrapper({
  children,
  className,
  requiredText,
  required,
  ...rest
}: RequiredWrapperProps): ReactElement {
  return (
    <span {...rest} className={className}>
      {children}
      {requiredText && (
        <StudioTag className={classes.requiredTag} data-color={required ? 'warning' : 'info'}>
          {requiredText}
        </StudioTag>
      )}
    </span>
  );
}
