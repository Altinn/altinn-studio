import React, { forwardRef } from 'react';
import type { ReactElement, ReactNode, Ref } from 'react';
import { Popover } from '@digdir/designsystemet-react';
import type {
  PopoverProps,
  PopoverTriggerContextProps,
  PopoverTriggerProps,
} from '@digdir/designsystemet-react';
import type { WithoutAsChild } from '../../types/WithoutAsChild';
import type { IconPlacement } from '../../types/IconPlacement';
import { TextWithIcon } from '../TextWithIcon';

export type StudioPopoverProps = WithoutAsChild<PopoverProps>;
export type StudioPopoverTriggerContextProps = WithoutAsChild<PopoverTriggerContextProps>;

export function StudioPopover({ children, ...rest }: StudioPopoverProps): ReactElement {
  return <Popover {...rest}>{children}</Popover>;
}

export type StudioPopoverTriggerProps = {
  icon?: ReactNode;
  iconPlacement?: IconPlacement;
} & Omit<PopoverTriggerProps, 'asChild' | 'icon'>;

function StudioPopoverTrigger(
  { children, icon, iconPlacement = 'left', ...rest }: StudioPopoverTriggerProps,
  ref: Ref<HTMLButtonElement>,
): ReactElement {
  return (
    <Popover.Trigger ref={ref} {...rest}>
      {icon ? (
        <TextWithIcon icon={icon} iconPlacement={iconPlacement}>
          {children}
        </TextWithIcon>
      ) : (
        children
      )}
    </Popover.Trigger>
  );
}

const ForwardedStudioPopoverTrigger = forwardRef(StudioPopoverTrigger);
export { ForwardedStudioPopoverTrigger as StudioPopoverTrigger };

export function StudioPopoverTriggerContext({
  children,
  ...rest
}: StudioPopoverTriggerContextProps): ReactElement {
  return <Popover.TriggerContext {...rest}>{children}</Popover.TriggerContext>;
}
