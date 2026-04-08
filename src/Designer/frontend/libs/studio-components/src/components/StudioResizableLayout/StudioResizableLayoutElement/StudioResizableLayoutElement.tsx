import type { ReactElement } from 'react';
import React, { forwardRef } from 'react';
import classes from './StudioResizableLayoutElement.module.css';
import { useStudioResizableLayoutContext } from '../hooks/useStudioResizableLayoutContext';
import { StudioResizableLayoutHandle } from '../StudioResizableLayoutHandle/StudioResizableLayoutHandle';

export type StudioResizableLayoutElementProps = {
  minimumSize?: number;
  maximumSize?: number;
  collapsedSize?: number;
  collapsed?: boolean;
  style?: React.CSSProperties;

  disableRightHandle?: boolean;

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
      minimumSize = 0,
      maximumSize,
      collapsedSize,
      collapsed,
      style,
      disableRightHandle,
      index,
      hasNeighbour = false,
      children,
    }: StudioResizableLayoutElementProps,
    ref,
  ): ReactElement => {
    const { orientation, containerSize, isResizing } = useStudioResizableLayoutContext(index ?? 0);

    return (
      <>
        <div
          data-testid='resizablelayoutelement'
          className={classes.container}
          style={{
            ...style,
            flexGrow: containerSize,
            maxWidth: collapsed ? collapsedSize : maximumSize,
            minWidth: collapsed ? collapsedSize : minimumSize,
            /* Ensures iFrames don't swallow the mouseup event needed to release the drag */
            pointerEvents: isResizing ? 'none' : undefined,
          }}
          ref={ref}
        >
          {children}
        </div>
        {hasNeighbour && (
          <StudioResizableLayoutHandle
            orientation={orientation}
            index={index ?? 0}
            disableRightHandle={disableRightHandle}
          />
        )}
      </>
    );
  },
);

StudioResizableLayoutElement.displayName = 'StudioResizableLayout.Element';

export { StudioResizableLayoutElement as StudioResizableLayoutElement };
