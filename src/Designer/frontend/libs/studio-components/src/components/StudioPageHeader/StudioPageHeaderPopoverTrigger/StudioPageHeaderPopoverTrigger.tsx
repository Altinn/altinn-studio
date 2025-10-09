import React, { forwardRef } from 'react';
import type { Ref } from 'react';
import type { StudioPopoverTriggerProps } from '../../StudioPopover';
import { StudioPopover } from '../../StudioPopover';
import cn from 'classnames';
import classes from '../common.module.css';
import type { StudioPageHeaderColor } from '../types/StudioPageHeaderColor';
import type { StudioPageHeaderVariant } from '../types/StudioPageHeaderVariant';

export type StudioPageHeaderPopoverTriggerProps = {
  color?: StudioPageHeaderColor;
  variant?: StudioPageHeaderVariant;
} & Omit<StudioPopoverTriggerProps, 'color' | 'variant'>;

function StudioPageHeaderPopoverTrigger(
  {
    color = 'dark',
    variant = 'regular',
    className: givenClass,
    ...rest
  }: StudioPageHeaderPopoverTriggerProps,
  ref: Ref<HTMLButtonElement>,
): React.ReactElement {
  const className = cn(classes.linkOrButton, classes[variant], classes[color], givenClass);
  return <StudioPopover.Trigger className={className} {...rest} ref={ref} />;
}

const ForwardedStudioPageHeaderPopoverTrigger = forwardRef(StudioPageHeaderPopoverTrigger);

export { ForwardedStudioPageHeaderPopoverTrigger as StudioPageHeaderPopoverTrigger };
