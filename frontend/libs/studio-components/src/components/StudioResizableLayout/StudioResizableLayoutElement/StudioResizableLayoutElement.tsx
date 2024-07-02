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
      maximumSize,
      collapsedSize,
      collapsed,
      children,
      hasNeighbour = false,
      style,
      onResizing,
    }: StudioResizableLayoutElementProps,
    ref,
  ): ReactElement => {
    const { orientation, containerSize } = useStudioResizableLayoutContext(index);

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
          }}
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
