import type { HTMLAttributes } from 'react';
import React, { forwardRef } from 'react';
import cn from 'classnames';
import classes from './StudioCodeFragment.module.css';

export type StudioCodeFragmentProps = HTMLAttributes<HTMLElement> & {
  customDatamodelBindingOverflowStyles?: boolean;
};

const StudioCodeFragment = forwardRef<HTMLElement, StudioCodeFragmentProps>(
  (
    { children, className: givenClass, customDatamodelBindingOverflowStyles = true, ...rest },
    ref,
  ) => {
    const className = cn(classes.code, givenClass);
    const customClassName = customDatamodelBindingOverflowStyles
      ? cn(className, classes.customDatamodelBindingOverflow)
      : className;

    return (
      <code className={customClassName} {...rest} ref={ref}>
        {children}
      </code>
    );
  },
);

StudioCodeFragment.displayName = 'StudioCodeFragment';

export { StudioCodeFragment };
