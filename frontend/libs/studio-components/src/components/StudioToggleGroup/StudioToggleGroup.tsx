import React, { forwardRef } from 'react';
import { ToggleGroup, ToggleGroupProps } from '@digdir/designsystemet-react';

export type StudioToggleGroupProps = ToggleGroupProps;

export const StudioToggleGroup = forwardRef<HTMLDivElement, StudioToggleGroupProps>(
  (props, ref) => {
    return <ToggleGroup size='sm' {...props} ref={ref} />;
  },
);

StudioToggleGroup.displayName = 'StudioToggleGroup';
