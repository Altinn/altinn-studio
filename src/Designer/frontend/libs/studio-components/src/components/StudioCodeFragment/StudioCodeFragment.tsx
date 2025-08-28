import React, { forwardRef } from 'react';
import type { HTMLAttributes, ReactElement, Ref } from 'react';
import cn from 'classnames';
import classes from './StudioCodeFragment.module.css';

export type StudioCodeFragmentProps = HTMLAttributes<HTMLElement>;

function StudioCodeFragment(
  { className: givenClass, children, ...rest }: StudioCodeFragmentProps,
  ref: Ref<HTMLElement>,
): ReactElement {
  const className = cn(classes.code, givenClass);

  return (
    <code className={className} {...rest} ref={ref}>
      {children}
    </code>
  );
}

const ForwardedStudioCodeFragment = forwardRef(StudioCodeFragment);

export { ForwardedStudioCodeFragment as StudioCodeFragment };
