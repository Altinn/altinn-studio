import React from 'react';
import {
  type PopoverProps,
  Popover,
  type PopoverTriggerProps,
  type PopoverContentProps,
} from '@digdir/designsystemet-react';

const StudioPopoverTrigger = ({ ...rest }: PopoverTriggerProps): React.ReactElement => {
  return <Popover.Trigger {...rest} />;
};

const StudioPopoverContent = ({ ...rest }: PopoverContentProps): React.ReactElement => {
  return <Popover.Content {...rest} />;
};

export type StudioPopoverProps = PopoverProps;

const StudioPopoverRoot = ({ ...rest }: StudioPopoverProps): React.ReactElement => {
  return <Popover {...rest} />;
};

type StudioPopoverComponent = typeof StudioPopoverRoot & {
  Trigger: typeof StudioPopoverTrigger;
  Content: typeof StudioPopoverContent;
};

const StudioPopover = StudioPopoverRoot as StudioPopoverComponent;

StudioPopover.Trigger = StudioPopoverTrigger;
StudioPopover.Content = StudioPopoverContent;

export { StudioPopover, StudioPopoverTrigger, StudioPopoverContent };
