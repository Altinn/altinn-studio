import React, { forwardRef, useCallback, useState } from 'react';
import { Combobox } from '@digdir/designsystemet-react';
//TODO: Update import path when v1 of the Design system has been updated to export it from index: https://github.com/Altinn/altinn-studio/issues/13531
import type { ComboboxProps } from '@digdir/designsystemet-react/dist/types/components/form/Combobox/Combobox';
import type { WithoutAsChild } from '../../types/WithoutAsChild';
import { useForwardedRef } from '@studio/hooks';
import { isWithinDialog } from './isWithinDialog';

export type StudioComboboxProps = WithoutAsChild<ComboboxProps>;

export const StudioCombobox = forwardRef<HTMLInputElement, StudioComboboxProps>(
  ({ children, size = 'sm', portal: givenPortal = true, ...rest }, ref): JSX.Element => {
    const forwardedRef = useForwardedRef<HTMLInputElement>(ref);
    const [portal, setPortal] = useState<boolean>(givenPortal);

    const internalRef = useCallback(
      (node?: HTMLInputElement) => {
        forwardedRef.current = node;
        if (node && isWithinDialog(node)) setPortal(false);
      },
      [forwardedRef],
    );

    return (
      <Combobox ref={internalRef} size={size} {...rest} portal={portal}>
        {children}
      </Combobox>
    );
  },
);

StudioCombobox.displayName = 'StudioCombobox';
