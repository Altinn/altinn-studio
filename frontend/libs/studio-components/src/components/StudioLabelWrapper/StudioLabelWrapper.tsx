import React from 'react';
import type { HTMLAttributes, ReactElement, ReactNode } from 'react';
import classes from './StudioLabelWrapper.module.css';
import { StudioTag } from '../StudioTag';

export type StudioLabelWrapperProps = {
  children: ReactNode;
  requiredText?: string;
  required?: boolean;
};

/**
 * If there are more than one input field on a page, and some of them are reqquired,
 * Designsystemet recommends to use a tag on all fields to indicate clearly which
 * fields are required or not.
 * Read more here: https://www.designsystemet.no/monstre/obligatoriske-og-valgfrie-felt
 */
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
