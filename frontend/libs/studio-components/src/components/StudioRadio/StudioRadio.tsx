import React, { forwardRef } from 'react';
import type { ReactElement, Ref } from 'react';
import { Radio, type RadioProps } from '@digdir/designsystemet-react';
import { hasAriaLabel, hasAriaLabelledBy } from '../../utils/labelUtils';

export type StudioRadioProps = RadioProps;

function StudioRadio(
  { label, ...rest }: StudioRadioProps,
  ref: Ref<HTMLInputElement>,
): ReactElement {
  // Designsystemet has conditional types, so if we extract label from props, we must
  // check if the usage has aria-labelledby or aria-label and if true not use the label.
  if (hasAriaLabelledBy(rest) || hasAriaLabel(rest)) {
    return <Radio ref={ref} {...rest} />;
  }

  return <Radio {...rest} ref={ref} label={label} />;
}
const ForwardedStudioRadio = forwardRef(StudioRadio);

export { ForwardedStudioRadio as StudioRadio };
