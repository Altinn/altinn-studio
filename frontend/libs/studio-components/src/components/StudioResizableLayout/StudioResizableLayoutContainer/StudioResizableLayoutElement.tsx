import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import classes from './StudioResizableLayoutElement.module.css';
import { useStudioResizableLayoutContext } from '../hooks/useStudioResizableLayoutContext';
import { useMouseMovement } from '../hooks/useMouseMovement';
import { useKeyboardControls } from '../hooks/useKeyboardControls';

export type StudioResizableLayoutElementProps = {
  minimumSize?: number;
  canBeCollapsed?: boolean;
  collapsedSize?: number;
  collapsed?: boolean;

  resize?: (size: number) => void;
  hasNeighbour?: boolean;

  index?: number;
  children: React.ReactElement | React.ReactElement[];
  ref?: React.Ref<HTMLDivElement>;
};

const StudioResizableLayoutElement = forwardRef(
  (
    {
      minimumSize = 0,
      index,
      collapsed,
      children,
      hasNeighbour = false,
    }: StudioResizableLayoutElementProps,
    ref,
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    useImperativeHandle(ref, () => containerRef.current);
    const { resizeDelta, collapse, orientation, containerSize } =
      useStudioResizableLayoutContext(index);
    const { onMouseDown, isResizing } = useMouseMovement(orientation, (delta) => {
      resizeDelta(index, delta);
    });
    const { onKeyDown } = useKeyboardControls((delta) => {
      resizeDelta(index, delta);
    });

    useEffect(() => {
      if (collapsed) {
        collapse(index);
      } else {
        resizeDelta(index, 0);
      }
      // disable linter as we only want to run this effect if the collapsed prop changes
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [collapsed]);

    return (
      <>
        <div className={classes.container} style={{ flexGrow: containerSize }} ref={containerRef}>
          {collapsed}
          {children}
        </div>
        {hasNeighbour && (
          <div
            tabIndex={0}
            className={orientation === 'horizontal' ? classes.resizeHandleH : classes.resizeHandleV}
            onMouseDown={onMouseDown}
            onKeyDown={onKeyDown}
            style={{
              backgroundColor: isResizing ? 'gray' : 'darkgray',
            }}
          ></div>
        )}
      </>
    );
  },
);

StudioResizableLayoutElement.displayName = 'StudioResizableLayout.Element';

export { StudioResizableLayoutElement as StudioResizableLayoutElement };
