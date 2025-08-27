import React, { forwardRef } from 'react';
import { type PopoverProps, Popover, type PopoverContentProps } from '@digdir/designsystemet-react';
import type { WithoutAsChild } from '../../types/WithoutAsChild';
import type { StudioButtonProps } from '../StudioButton';
import { StudioButton } from '../StudioButton';

export type StudioPopoverTriggerProps = StudioButtonProps;

const StudioPopoverTrigger = forwardRef<HTMLButtonElement, StudioPopoverTriggerProps>(
  (props, ref): React.ReactElement => (
    <Popover.Trigger asChild>
      <StudioButton {...props} ref={ref} />
    </Popover.Trigger>
  ),
);

StudioPopoverTrigger.displayName = 'StudioPopover.Trigger';

export type StudioPopoverContentProps = WithoutAsChild<PopoverContentProps>;

const StudioPopoverContent = forwardRef<HTMLDivElement, StudioPopoverContentProps>(
  (props, ref): React.ReactElement => <Popover.Content {...props} ref={ref} />,
);

StudioPopoverContent.displayName = 'StudioPopover.Content';

export type StudioPopoverProps = WithoutAsChild<PopoverProps>;

function StudioPopoverRoot(props: StudioPopoverProps): React.ReactElement {
  return <Popover {...props} />;
}

type StudioPopoverComponent = typeof StudioPopoverRoot & {
  Trigger: typeof StudioPopoverTrigger;
  Content: typeof StudioPopoverContent;
};

const StudioPopover = StudioPopoverRoot as StudioPopoverComponent;

StudioPopover.Trigger = StudioPopoverTrigger;
StudioPopover.Content = StudioPopoverContent;

export { StudioPopover, StudioPopoverTrigger, StudioPopoverContent };
