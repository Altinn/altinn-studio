import React, { forwardRef } from 'react';
import type { ReactElement, Ref } from 'react';
import { Popover } from '@digdir/designsystemet-react';
import type {
  PopoverProps,
  PopoverTriggerContextProps,
  PopoverTriggerProps,
} from '@digdir/designsystemet-react';
import type { WithoutAsChild } from '../../types/WithoutAsChild';

export type StudioPopoverProps = WithoutAsChild<PopoverProps>;
export type StudioPopoverTriggerProps = PopoverTriggerProps;
export type StudioPopoverTriggerContextProps = WithoutAsChild<PopoverTriggerContextProps>;

export function StudioPopover({ children, ...rest }: StudioPopoverProps): ReactElement {
  return <Popover {...rest}>{children}</Popover>;
}

function StudioPopoverTrigger(
  { children, ...rest }: StudioPopoverTriggerProps,
  ref: Ref<HTMLButtonElement>,
): ReactElement {
  return (
    <Popover.Trigger ref={ref} {...rest}>
      {children}
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
