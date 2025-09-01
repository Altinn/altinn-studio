import React from 'react';
import type { HTMLAttributes, ReactElement, ReactNode } from 'react';
import classes from './StudioLabelWrapper.module.css';
import { StudioTag } from '../StudioTag';

export type StudioLabelWrapperProps = {
  children: ReactNode;
  tagText?: string;
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
  tagText,
  required,
}: StudioLabelWrapperProps): ReactElement {
  return (
    <RequiredWrapper required={required} tagText={tagText}>
      {children}
    </RequiredWrapper>
  );
}

type RequiredWrapperProps = HTMLAttributes<HTMLSpanElement> & {
  tagText?: string;
  required?: boolean;
};

function RequiredWrapper({
  children,
  className,
  tagText,
  required,
  ...rest
}: RequiredWrapperProps): ReactElement {
  return (
    <span {...rest} className={className}>
      {children}
      {tagText && (
        <StudioTag className={classes.requiredTag} data-color={required ? 'warning' : 'info'}>
          {tagText}
        </StudioTag>
      )}
    </span>
  );
}
