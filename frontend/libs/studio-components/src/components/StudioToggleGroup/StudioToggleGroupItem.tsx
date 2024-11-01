import React, { forwardRef } from 'react';
import { ToggleGroup, ToggleGroupItemProps } from '@digdir/designsystemet-react';
import { ValueWithIcon, ValueWithIconProps } from '../internals/ValueWithIcon';

export type StudioToggleGroupItemProps = Omit<ToggleGroupItemProps, 'icon'> & ValueWithIconProps;

export const StudioToggleGroupItem = forwardRef<HTMLButtonElement, StudioToggleGroupItemProps>(
  ({ children, icon, iconPlacement, ...rest }, ref) => {
    return (
      <ToggleGroup.Item {...rest} ref={ref}>
        <ValueWithIcon icon={icon} iconPlacement={iconPlacement}>
          {children}
        </ValueWithIcon>
      </ToggleGroup.Item>
    );
  },
);

StudioToggleGroupItem.displayName = 'StudioToggleGroup.Item';
