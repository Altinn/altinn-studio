import type { ReactElement } from 'react';
import { useStudioResizableLayoutContext } from '../hooks/useStudioResizableLayoutContext';
import type { StudioResizableOrientation } from '../StudioResizableLayoutContainer/StudioResizableLayoutContainer';
import classes from './StudioResizableLayoutHandle.module.css';
import { useKeyboardControls } from '../hooks/useKeyboardControls';
import { useStudioResizableLayoutMouseMovement } from '../hooks/useStudioResizableLayoutMouseMovement';

export type StudioResizableLayoutHandleProps = {
  orientation: StudioResizableOrientation;
  index: number;
  disableRightHandle?: boolean;
};

export const StudioResizableLayoutHandle = ({
  orientation,
  index,
  disableRightHandle,
}: StudioResizableLayoutHandleProps): ReactElement => {
  const { resizeDelta, containerSize, isResizing, setIsResizing } =
    useStudioResizableLayoutContext(index);
  const { onMouseDown } = useStudioResizableLayoutMouseMovement(
    orientation,
    (delta) => resizeDelta(index, delta),
    setIsResizing,
  );
  const { onKeyDown } = useKeyboardControls((delta) => resizeDelta(index, delta));

  if (disableRightHandle) {
    return (
      <div
        role='separator'
        aria-disabled={true}
        className={`${classes.resizeHandle}
                  ${containerSize < 0.05 ? classes.hideLeftSide : ''}`}
      ></div>
    );
  }

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
