import React, { forwardRef } from 'react';
import type { Ref, ReactElement } from 'react';
import { Textfield } from '@digdir/designsystemet-react';
import type { TextfieldProps } from '@digdir/designsystemet-react';
import { StudioLabelWrapper } from '../StudioLabelWrapper';

export type StudioTextfieldProps = TextfieldProps & {
  withAsterisk?: boolean;
};

function StudioTextfield(
  { children, withAsterisk, label, ...rest }: StudioTextfieldProps,
  ref: Ref<HTMLInputElement>,
): ReactElement {
  if (hasAriaLabelledBy(rest) || hasAriaLabel(rest)) {
    return <Textfield ref={ref} {...rest} />;
  }

  const labelComponent = (
    <StudioLabelWrapper withAsterisk={withAsterisk}>{label}</StudioLabelWrapper>
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
