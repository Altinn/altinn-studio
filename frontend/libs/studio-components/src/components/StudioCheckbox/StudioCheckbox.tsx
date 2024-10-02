import React, { forwardRef, useContext } from 'react';
import type { CheckboxProps } from '@digdir/designsystemet-react';
import { Checkbox } from '@digdir/designsystemet-react';
import type { StudioCheckboxGroupContextProps } from './StudioCheckboxGroupContext';
import { StudioCheckboxGroupContext } from './StudioCheckboxGroupContext';

export type StudioCheckboxProps = CheckboxProps;

export const StudioCheckbox = forwardRef<HTMLInputElement, StudioCheckboxProps>(
  ({ size, ...rest }, ref) => {
    const { size: groupSize } = useContext<StudioCheckboxGroupContextProps>(
      StudioCheckboxGroupContext,
    );
    const finalSize = size || groupSize;
    return <Checkbox size={finalSize} {...rest} ref={ref} />;
  },
);

StudioCheckbox.displayName = 'StudioCheckbox';
