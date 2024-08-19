import React, { forwardRef } from 'react';
import type { CheckboxProps } from '@digdir/designsystemet-react';
import { Checkbox } from '@digdir/designsystemet-react';

export type StudioCheckboxProps = CheckboxProps;

export const StudioCheckbox = forwardRef<HTMLInputElement, StudioCheckboxProps>((props, ref) => (
  <Checkbox ref={ref} size='small' {...props} />
));

StudioCheckbox.displayName = 'StudioCheckbox';
