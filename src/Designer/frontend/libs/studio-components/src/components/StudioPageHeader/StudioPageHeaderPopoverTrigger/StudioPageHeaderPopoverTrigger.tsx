import React, { forwardRef } from 'react';
import type { Ref } from 'react';
import type { StudioPopoverTriggerProps } from '../../StudioPopover';
import { StudioPopover } from '../../StudioPopover';

export type StudioPageHeaderPopoverTriggerProps = {} & StudioPopoverTriggerProps;

function StudioPageHeaderPopoverTrigger(
  { className: givenClass, ...rest }: StudioPageHeaderPopoverTriggerProps,
  ref: Ref<HTMLButtonElement>,
): React.ReactElement {
  const className = givenClass;
  return <StudioPopover.Trigger className={className} {...rest} ref={ref} />;
}

const ForwardedStudioPageHeaderPopoverTrigger = forwardRef(StudioPageHeaderPopoverTrigger);

export { ForwardedStudioPageHeaderPopoverTrigger as StudioPageHeaderPopoverTrigger };
