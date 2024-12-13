import React, { forwardRef, useId } from 'react';
import { NativeSelect, type NativeSelectProps } from '@digdir/designsystemet-react';

export type StudioNativeSelectProps = NativeSelectProps;

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
