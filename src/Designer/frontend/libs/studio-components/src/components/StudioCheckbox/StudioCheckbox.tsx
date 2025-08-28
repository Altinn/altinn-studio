import React, { forwardRef } from 'react';
import type { ReactElement, Ref } from 'react';
import { Checkbox } from '@digdir/designsystemet-react';
import type { CheckboxProps } from '@digdir/designsystemet-react';
import { hasAriaLabel, hasAriaLabelledBy } from '../../utils/labelUtils';
import { StudioLabelWrapper } from '../StudioLabelWrapper';

export type StudioCheckboxProps = CheckboxProps & {
  tagText?: string;
};

function StudioCheckbox(
  { required, tagText, label, ...rest }: StudioCheckboxProps,
  ref: Ref<HTMLInputElement>,
): ReactElement {
  // Designsystemet has conditional types, so if we extract label from props, we must
  // check if the usage has aria-labelledby or aria-label and if true not use the label.
  if (hasAriaLabelledBy(rest) || hasAriaLabel(rest)) {
    return <Checkbox ref={ref} {...rest} />;
  }

  return (
    <Checkbox
      {...rest}
      ref={ref}
      label={
        <StudioLabelWrapper required={required} tagText={tagText}>
          {label}
        </StudioLabelWrapper>
      }
    />
  );
}

const ForwardedStudioCheckbox = forwardRef(StudioCheckbox);

export { ForwardedStudioCheckbox as StudioCheckbox };
