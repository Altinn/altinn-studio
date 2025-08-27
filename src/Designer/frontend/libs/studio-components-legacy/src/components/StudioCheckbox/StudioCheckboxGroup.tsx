import React, { forwardRef } from 'react';
import type { CheckboxGroupProps } from '@digdir/designsystemet-react';
import { Checkbox } from '@digdir/designsystemet-react';
import { StudioCheckboxGroupContext } from './StudioCheckboxGroupContext';
import { DEFAULT_CHECKBOX_SIZE } from './constants';
import type { WithoutAsChild } from '../../types/WithoutAsChild';

export type StudioCheckboxGroupProps = WithoutAsChild<CheckboxGroupProps>;

/**
 * @deprecated Use `StudioCheckboxGroup` from `@studio/components` instead.
 */
export const StudioCheckboxGroup = forwardRef<HTMLFieldSetElement, StudioCheckboxGroupProps>(
  ({ children, size = DEFAULT_CHECKBOX_SIZE, ...rest }, ref) => (
    <Checkbox.Group size={size} {...rest} ref={ref}>
      <StudioCheckboxGroupContext.Provider value={{ size }}>
        {children}
      </StudioCheckboxGroupContext.Provider>
    </Checkbox.Group>
  ),
);

StudioCheckboxGroup.displayName = 'StudioCheckbox.Group';
