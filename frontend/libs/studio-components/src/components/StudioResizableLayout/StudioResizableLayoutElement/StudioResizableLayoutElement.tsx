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

const StudioResizableLayoutElement = forwardRef<HTMLDivElement, StudioResizableLayoutElementProps>(
  (
    {
      index,
      minimumSize = 0,
      collapsed,
      children,
      hasNeighbour = false,
      style,
      onResizing,
    }: StudioResizableLayoutElementProps,
    ref,
  ) => {
    const { resizeTo, collapse, orientation, containerSize } =
      useStudioResizableLayoutContext(index);

    useEffect(() => {
      if (collapsed) {
        collapse(index);
      } else {
        resizeTo(index, minimumSize);
      }
      // disable linter as we only want to run this effect if the collapsed prop changes
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [collapsed]);

    return (
      <>
        <div
          data-testid='resizablelayoutelement'
          className={classes.container}
          style={{ ...style, flexGrow: containerSize }}
          ref={ref}
        >
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
