import React, { useCallback, useRef, useState } from 'react';
import classes from './StudioResizableLayoutContainer.module.css';
import { useResizable } from '../hooks/useResizable';
import { useStudioResizableLayoutContext } from '../hooks/useStudioResizableLayoutContext';

export type StudioResizableLayoutContainerProps = {
  minimumSize?: number;
  canBeCollapsed?: boolean;
  flexGrow?: number;
  children: React.ReactElement | React.ReactElement[];
};

const StudioResizableLayoutContainer = ({
  children,
  minimumSize = 0,
  flexGrow = 1,
}: StudioResizableLayoutContainerProps) => {
  const { resizeDelta } = useResizable(minimumSize);
  const { orientation } = useStudioResizableLayoutContext();
  const containerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const lastMousePosition = useRef<number>(0);
  const [isResizing, setIsResizing] = useState<boolean>(false);

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>): void {
    const nextSibling = handleRef.current.nextElementSibling;
    let deltaMove = 0;
    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        deltaMove = -10;
        if (event.shiftKey) {
          deltaMove *= 5;
        }
        resizeDelta(containerRef.current, nextSibling, deltaMove);
        break;
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        deltaMove = 10;
        if (event.shiftKey) {
          deltaMove *= 5;
        }
        resizeDelta(containerRef.current, nextSibling, deltaMove);
        break;
    }
  }

  const mouseMove = useCallback(
    (event: MouseEvent) => {
      const mousePos = orientation === 'horizontal' ? event.pageX : event.pageY;
      const mouseDelta = mousePos - lastMousePosition.current;
      const nextSibling = handleRef.current.nextElementSibling;
      resizeDelta(containerRef.current, nextSibling, mouseDelta);
      lastMousePosition.current = mousePos;
    },
    [resizeDelta, orientation],
  );

  const mouseUp = useCallback(
    (_: MouseEvent) => {
      setIsResizing(false);
      window.removeEventListener('mousemove', mouseMove);
      window.removeEventListener('mouseup', mouseUp);
    },
    [mouseMove],
  );

  const mouseDown = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsResizing(true);
      lastMousePosition.current = orientation === 'horizontal' ? event.pageX : event.pageY;
      window.addEventListener('mousemove', mouseMove);
      window.addEventListener('mouseup', mouseUp);

      return () => {
        window.removeEventListener('mousemove', mouseMove);
        window.removeEventListener('mouseup', mouseUp);
      };
    },
    [mouseMove, mouseUp, orientation],
  );

  return (
    <>
      <div className={classes.container} style={{ flexGrow: flexGrow }} ref={containerRef}>
        {children}
      </div>
      <div
        tabIndex={0}
        className={classes.resizeHandle}
        onMouseDown={mouseDown}
        onKeyDown={handleKeyDown}
        style={{
          backgroundColor: isResizing ? 'gray' : 'darkgray',
          cursor: orientation === 'horizontal' ? 'col-resize' : 'row-resize',
        }}
        ref={handleRef}
      ></div>
    </>
  );
};

StudioResizableLayoutContainer.displayName = 'StudioResizableLayout.Container';

export { StudioResizableLayoutContainer };
