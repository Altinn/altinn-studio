import React, { forwardRef } from 'react';
import type { CheckboxGroupProps } from '@digdir/designsystemet-react';
import { Checkbox } from '@digdir/designsystemet-react';
import { StudioCheckboxGroupContext } from './StudioCheckboxGroupContext';

export type StudioCheckboxGroupProps = CheckboxGroupProps;

export const StudioCheckboxGroup = forwardRef<HTMLFieldSetElement, StudioCheckboxGroupProps>(
  ({ children, size = 'sm', ...rest }, ref) => (
    <Checkbox.Group size={size} {...rest} ref={ref}>
      <StudioCheckboxGroupContext.Provider value={{ size }}>
        {children}
      </StudioCheckboxGroupContext.Provider>
    </Checkbox.Group>
  ),
);

StudioCheckboxGroup.displayName = 'StudioCheckbox.Group';
