import React, { forwardRef } from 'react';
import type { HTMLAttributes, ReactElement } from 'react';
import classes from './StudioCenter.module.css';
import cn from 'classnames';

type StudioCenterProps = HTMLAttributes<HTMLDivElement>;

function StudioCenter(
  { className, ...rest }: StudioCenterProps,
  ref: React.Ref<HTMLDivElement>,
): ReactElement {
  return <div ref={ref} className={cn(className, classes.root)} {...rest} />;
}

const ForwardedStudioCenter = forwardRef(StudioCenter);

export { ForwardedStudioCenter as StudioCenter };
