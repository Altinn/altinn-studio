import React from 'react';
import type { ReactElement } from 'react';
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

export function StudioPopoverTrigger({
  children,
  ...rest
}: StudioPopoverTriggerProps): ReactElement {
  return <Popover.Trigger {...rest}>{children}</Popover.Trigger>;
}

export function StudioPopoverTriggerContext({
  children,
  ...rest
}: StudioPopoverTriggerContextProps): ReactElement {
  return <Popover.TriggerContext {...rest}>{children}</Popover.TriggerContext>;
}
