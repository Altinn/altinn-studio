import React, { forwardRef } from 'react';
import { Combobox } from '@digdir/designsystemet-react';
//TODO: Update import path when v1 of the Design system has been updated to export it from index: https://github.com/Altinn/altinn-studio/issues/13531
import type { ComboboxProps } from '@digdir/designsystemet-react/dist/types/components/form/Combobox/Combobox';

export type StudioComboboxProps = ComboboxProps;

export const StudioCombobox = forwardRef<HTMLInputElement, StudioComboboxProps>(
  ({ children, size = 'sm', ...rest }, ref): JSX.Element => {
    return (
      <Combobox ref={ref} size={size} {...rest}>
        {children}
      </Combobox>
    );
  },
);

StudioCombobox.displayName = 'StudioCombobox';
