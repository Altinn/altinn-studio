import React, { useCallback, useRef, useState } from 'react';
import cn from 'classnames';

import classes from './AnimateHeight.module.css';
import { usePrevious } from '../../hooks/usePrevious';
import { useMediaQuery } from '../../hooks/useMediaQuery';

export type AnimateHeightProps = {
  open: boolean;
} & React.HTMLAttributes<HTMLDivElement>;

type InternalState = 'open' | 'closed' | 'openingOrClosing';

const transitionDurationInMilliseconds = 250;

/**
 * AnimateHeight is a component that animates its height when the `open` prop changes.
 */
export const AnimateHeight = ({
  children,
  className, // eslint-disable-line react/prop-types
  open = false,
  style, // eslint-disable-line react/prop-types
  ...rest
}: AnimateHeightProps) => {
  const [height, setHeight] = useState<number>(0);
  const prevOpen = usePrevious(open);
  const openOrClosed: InternalState = open ? 'open' : 'closed';
  const [state, setState] = useState<InternalState>(openOrClosed);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldAnimate = !useMediaQuery('(prefers-reduced-motion)');

  const contentRef = useCallback(
    (node: HTMLDivElement) => {
      if (node) {
        const resizeObserver = new ResizeObserver(() => {
          setHeight(open ? node.getBoundingClientRect().height : 0);
        });
        resizeObserver.observe(node);
      }
      if (prevOpen !== undefined && prevOpen !== open) {
        // Opening or closing
        setState(shouldAnimate ? 'openingOrClosing' : openOrClosed);
        timeoutRef.current && clearTimeout(timeoutRef.current); // Reset timeout if already active (i.e. if the user closes the component before it finishes opening)
        timeoutRef.current = setTimeout(() => {
          setState(openOrClosed);
        }, transitionDurationInMilliseconds);
      }
    },
    [open, openOrClosed, prevOpen, shouldAnimate],
  );

  const transition =
    state === 'openingOrClosing'
      ? `height ${transitionDurationInMilliseconds}ms ease-in-out`
      : undefined;

  return (
    <div
      {...rest}
      className={cn(classes.root, classes[state], className)}
      style={{ height, transition, ...style }}
    >
      <div ref={contentRef} className={classes.content}>
        {children}
      </div>
    </div>
  );
};
