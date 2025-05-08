import React, { forwardRef } from 'react';
import type { Ref, ReactElement, HTMLAttributes } from 'react';
import classes from './StudioTextfield.module.css';
import { Textfield } from '@digdir/designsystemet-react';
import type { TextfieldProps } from '@digdir/designsystemet-react';
import { StudioTag } from '../StudioTag';

export type StudioTextfieldProps = TextfieldProps & {
  requiredText?: string;
};

function StudioTextfield(
  { children, required, requiredText, label, ...rest }: StudioTextfieldProps,
  ref: Ref<HTMLInputElement>,
): ReactElement {
  // Designsystemet has conditional types, so if we extract label from props, we must
  // check if the usage has aria-labelledby or aria-label and if true not use the label.
  if (hasAriaLabelledBy(rest) || hasAriaLabel(rest)) {
    return <Textfield ref={ref} {...rest} />;
  }

  const labelComponent = (
    <RequiredWrapper required={required} requiredText={requiredText}>
      {label}
    </RequiredWrapper>
  );

  return <Textfield ref={ref} {...rest} label={labelComponent} />;
}

function hasAriaLabelledBy(props: Record<string, unknown>): props is { 'aria-labelledby': string } {
  return typeof props['aria-labelledby'] === 'string';
}

function hasAriaLabel(props: Record<string, unknown>): props is { 'aria-label': string } {
  return typeof props['aria-label'] === 'string';
}

const ForwardedStudioTextfield = forwardRef(StudioTextfield);

export { ForwardedStudioTextfield as StudioTextfield };

export type RequiredWrapperProps = HTMLAttributes<HTMLSpanElement> & {
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
