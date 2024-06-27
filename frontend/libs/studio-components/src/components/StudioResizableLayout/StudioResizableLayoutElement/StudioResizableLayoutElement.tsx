import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import classes from './StudioResizableLayoutElement.module.css';
import { useStudioResizableLayoutContext } from '../hooks/useStudioResizableLayoutContext';
import { StudioResizableLayoutHandle } from '../StudioResizableLayoutHandle/StudioResizableLayoutHandle';

export type StudioResizableLayoutElementProps = {
  minimumSize?: number;
  collapsedSize?: number;
  collapsed?: boolean;
  style?: React.CSSProperties;

  onResizing?: (resizing: boolean) => void;

  //** supplied from container **//
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
      style,
      onResizing,
    }: StudioResizableLayoutElementProps,
    ref,
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    useImperativeHandle(ref, () => containerRef.current);

    const { resizeDelta, collapse, orientation, containerSize } =
      useStudioResizableLayoutContext(index);

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
        <div
          className={classes.container}
          style={{ ...style, flexGrow: containerSize }}
          ref={containerRef}
        >
          {collapsed}
          {children}
        </div>
        {hasNeighbour && (
          <StudioResizableLayoutHandle
            orientation={orientation}
            index={index}
            onResizing={onResizing}
          />
        )}
      </>
    );
  },
);

StudioResizableLayoutElement.displayName = 'StudioResizableLayout.Element';

export { StudioResizableLayoutElement as StudioResizableLayoutElement };
