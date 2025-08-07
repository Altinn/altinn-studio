import React, { forwardRef } from 'react';
import type { Ref, ReactElement } from 'react';
import { Textfield } from '@digdir/designsystemet-react';
import type { TextfieldProps } from '@digdir/designsystemet-react';
import { hasAriaLabel, hasAriaLabelledBy } from '../../utils/labelUtils';
import { StudioLabelWrapper } from '../StudioLabelWrapper';

export type StudioTextfieldProps = TextfieldProps & {
  tagText?: string;
} & Omit<TextfieldProps, 'multiline'>;

function StudioTextfield(
  { children, required, tagText, label, ...rest }: StudioTextfieldProps,
  ref: Ref<HTMLInputElement>,
): ReactElement {
  // Designsystemet has conditional types, so if we extract label from props, we must
  // check if the usage has aria-labelledby or aria-label and if true not use the label.
  if (hasAriaLabelledBy(rest) || hasAriaLabel(rest)) {
    return <Textfield multiline={false} ref={ref} {...rest} />;
  }

  return (
    <Textfield
      ref={ref}
      multiline={false}
      {...rest}
      label={
        <StudioLabelWrapper required={required} tagText={tagText}>
          {label}
        </StudioLabelWrapper>
      }
    />
  );
}

const ForwardedStudioTextfield = forwardRef(StudioTextfield);

export { ForwardedStudioTextfield as StudioTextfield };
