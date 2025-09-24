/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
import React, { useState } from 'react';
import type { ErrorInfo, PropsWithChildren } from 'react';

import { XMarkIcon } from '@navikt/aksel-icons';

import { Button } from 'src/app-components/Button/Button';
import classes from 'src/features/devtools/DevTools.module.css';
import { DevToolsControls } from 'src/features/devtools/DevToolsControls';

function clampHeight(height: number): number {
  return Math.min(Math.max(height, 10), window.innerHeight);
}

interface IDevToolsPanelProps {
  isOpen: boolean;
  close: () => void;
}

export const DevToolsPanel = ({ isOpen, close }: IDevToolsPanelProps) => {
  const [height, setHeight] = useState(250);

  const resizeHandler = (mouseDownEvent: React.MouseEvent) => {
    mouseDownEvent.preventDefault();
    const startHeight = clampHeight(height);
    const startPosition = mouseDownEvent.screenY;

    function onMouseMove(mouseMoveEvent: MouseEvent) {
      if (mouseMoveEvent.buttons < 1) {
        onMouseUp();
        return;
      }
      setHeight(() => clampHeight(startHeight + startPosition - mouseMoveEvent.screenY));
    }
    function onMouseUp() {
      document.body.removeEventListener('mousemove', onMouseMove);
    }

    document.body.addEventListener('mousemove', onMouseMove);
    document.body.addEventListener('mouseup', onMouseUp, { once: true });
  };

  const resizeHandlerMobile = (touchStartEvent: React.TouchEvent) => {
    touchStartEvent.preventDefault();
    const startHeight = clampHeight(height);
    const startPosition = touchStartEvent.touches[0].screenY;

    function onTouchMove(touchMoveEvent: TouchEvent) {
      setHeight(() => clampHeight(startHeight + startPosition - touchMoveEvent.touches[0].screenY));
    }
    function onTouchEnd() {
      document.body.removeEventListener('touchmove', onTouchMove);
    }

    document.body.addEventListener('touchmove', onTouchMove);
    document.body.addEventListener('touchend', onTouchEnd, { once: true });
  };

  if (isOpen) {
    return (
      <>
        <div
          className={classes.pagePadding}
          style={{ paddingBottom: height }}
        />
        <div
          className={classes.panel}
          style={{ height }}
        >
          <div
            role='separator'
            className={classes.handle}
            onMouseDown={resizeHandler}
            onTouchStart={resizeHandlerMobile}
          />
          <div className={classes.panelContent}>
            <div className={classes.closeButtonContainer}>
              <div className={classes.closeButtonBackground}>
                <Button
                  className={classes.closeButton}
                  onClick={close}
                  variant='tertiary'
                  color='second'
                  aria-label='close'
                  icon={true}
                >
                  <XMarkIcon
                    fontSize='1rem'
                    aria-hidden
                  />
                </Button>
              </div>
            </div>
            <DevToolsErrorBoundary>
              <DevToolsControls />
            </DevToolsErrorBoundary>
          </div>
        </div>
      </>
    );
  }

  return null;
};

interface IErrorBoundary {
  lastError?: Error;
}
class DevToolsErrorBoundary extends React.Component<PropsWithChildren, IErrorBoundary> {
  constructor(props: PropsWithChildren) {
    super(props);
    this.state = { lastError: undefined };
  }

  static getDerivedStateFromError(lastError: Error): IErrorBoundary {
    return { lastError };
  }

  componentDidCatch(_: Error, info: ErrorInfo) {
    /**
     * In development, react already logs the component trace, so no need to do it manually as well.
     */
    if (process.env.NODE_ENV !== 'development') {
      console.error(`The above error occurred in the component:`, info.componentStack);
    }
  }

  render(): React.ReactNode {
    const { lastError } = this.state;
    const { children } = this.props;

    if (lastError) {
      return (
        <div className={classes.panelError}>
          <h2>An uncaught error occured</h2>
          <p>Check the browser&apos;s console for details</p>
        </div>
      );
    }

    return children;
  }
}
