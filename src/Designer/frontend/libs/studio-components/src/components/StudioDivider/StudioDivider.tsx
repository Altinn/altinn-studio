import React, { forwardRef } from 'react';
import type { ReactElement } from 'react';
import { Divider, type DividerProps } from '@digdir/designsystemet-react';
import cn from 'classnames';
import classes from './StudioDivider.module.css';

export type StudioDividerProps = {
  orientation?: 'horizontal' | 'vertical';
} & DividerProps;

function StudioDivider(
  { orientation = 'horizontal', className, ...rest }: StudioDividerProps,
  ref: React.Ref<HTMLHRElement>,
): ReactElement {
  return (
    <Divider
      {...rest}
      aria-orientation={orientation}
      className={cn(orientation === 'vertical' && classes.vertical, className)}
      ref={ref}
    />
  );
}

const ForwardedStudioDivider = forwardRef(StudioDivider);

export { ForwardedStudioDivider as StudioDivider };
