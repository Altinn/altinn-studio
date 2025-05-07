import type { HTMLAttributes, Ref, ReactElement } from 'react';
import React, { forwardRef } from 'react';
import classes from './StudioLabelWrapper.module.css';
import cn from 'classnames';

export type StudioLabelWrapperProps = HTMLAttributes<HTMLSpanElement> & {
  withAsterisk?: boolean;
};

function StudioLabelWrapper(
  { children, className, withAsterisk, ...rest }: StudioLabelWrapperProps,
  ref: Ref<HTMLSpanElement>,
): ReactElement {
  const finalClassName = cn(
    classes.studioLabelWrapper,
    withAsterisk && classes.withAsterisk,
    className,
  );

  return (
    <span className={finalClassName} {...rest} ref={ref}>
      {children}
    </span>
  );
}

const ForwardedStudioLabelWrapper = forwardRef(StudioLabelWrapper);

export { ForwardedStudioLabelWrapper as StudioLabelWrapper };
