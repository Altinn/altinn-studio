import React, { useEffect } from 'react';
import { useStudioResizableLayoutContext } from '../hooks/useStudioResizableLayoutContext';
import type { StudioResizableOrientation } from '../StudioResizableLayoutContainer/StudioResizableLayoutContainer';
import classes from './StudioResizableLayoutHandle.module.css';
import { useKeyboardControls } from '../hooks/useKeyboardControls';
import { useStudioResizableLayoutMouseMovement } from '../hooks/useStudioResizableLayoutMouseMovement';

export type StudioResizableLayoutHandleProps = {
  orientation: StudioResizableOrientation;
  index: number;
  onResizing?: (resizing: boolean) => void;
};

export const StudioResizableLayoutHandle = ({
  orientation,
  index,
  onResizing,
}: StudioResizableLayoutHandleProps) => {
  const { resizeDelta, containerSize } = useStudioResizableLayoutContext(index);
  const { onMouseDown, isResizing } = useStudioResizableLayoutMouseMovement(
    orientation,
    (delta, _) => {
      resizeDelta(index, delta);
    },
  );
  const { onKeyDown } = useKeyboardControls((delta) => resizeDelta(index, delta));

  useEffect(() => {
    onResizing?.(isResizing);
  }, [isResizing, onResizing]);

  return (
    <div
      role='separator'
      tabIndex={0}
      className={`${classes.resizeHandle}
                  ${orientation === 'horizontal' ? classes.resizeHandleH : classes.resizeHandleV}
                  ${containerSize < 0.05 ? classes.hideLeftSide : ''}`}
      onMouseDown={onMouseDown}
      onKeyDown={onKeyDown}
      style={{
        backgroundColor: isResizing ? 'gray' : 'darkgray',
      }}
    ></div>
  );
};
