import React, { forwardRef, useId } from 'react';
import { NativeSelect, type NativeSelectProps } from '@digdir/designsystemet-react';
import type { WithoutAsChild } from '../../types/WithoutAsChild';

export type StudioNativeSelectProps = WithoutAsChild<NativeSelectProps>;

/**
 * @deprecated Use `StudioSelect` from `@studio/components` instead.
 */
export const StudioNativeSelect = forwardRef<HTMLSelectElement, StudioNativeSelectProps>(
  ({ children, description, label, id, size, ...rest }, ref): React.JSX.Element => {
    const defaultId = useId();
    id = id ?? defaultId;
    return (
      <NativeSelect description={description} label={label} ref={ref} size={size} id={id} {...rest}>
        {children}
      </NativeSelect>
    );
  },
);

StudioNativeSelect.displayName = 'StudioNativeSelect';
