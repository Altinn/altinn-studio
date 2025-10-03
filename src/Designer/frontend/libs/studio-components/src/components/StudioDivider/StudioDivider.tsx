import React, { forwardRef } from 'react';
import type { HTMLAttributes, ReactElement } from 'react';
import classes from './StudioDivider.module.css';
import { Divider } from '@digdir/designsystemet-react';
import cn from 'classnames';

export type StudioDividerColor = 'default' | 'strong' | 'subtle';

export type StudioDividerProps = {
  color?: StudioDividerColor;
} & HTMLAttributes<HTMLHRElement>;

function StudioDivider(
  { color = 'default', className, ...rest }: StudioDividerProps,
  ref: React.Ref<HTMLHRElement>,
): ReactElement {
  return <Divider ref={ref} className={cn(classes.divider, classes[color], className)} {...rest} />;
}

const ForwardedStudioDivider = forwardRef(StudioDivider);

export { ForwardedStudioDivider as StudioDivider };
