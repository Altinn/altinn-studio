import React from 'react';
// import classes from './StudioPopover.module.css';
import {
  type PopoverProps,
  Popover,
  type PopoverTriggerProps,
  type PopoverContentProps,
} from '@digdir/design-system-react';

const StudioPopoverTrigger = ({ ...rest }: PopoverTriggerProps): React.ReactElement => {
  return <Popover.Trigger {...rest} />;
};

const StudioPopoverContent = ({ ...rest }: PopoverContentProps): React.ReactElement => {
  return <Popover.Content {...rest} />;
};

const StudioPopoverRoot = ({ ...rest }: PopoverProps): React.ReactElement => {
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
