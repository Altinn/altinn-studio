import type { HTMLAttributes } from 'react';
import React, { Children, useEffect, useRef } from 'react';
import classes from './StudioResizableLayoutRoot.module.css';

export type StudioResizableLayoutRootProps = {
  orientation: 'horizontal' | 'vertical';
  children: React.ReactElement[];
};

export type SiblingElements = {
  self: HTMLElement | null;
  next: HTMLElement | null;
};

export const StudioResizableLayoutContext = React.createContext({
  orientation: 'horizontal',
});

const StudioResizableLayoutRoot = ({
  children,
  orientation,
}: StudioResizableLayoutRootProps): React.ReactElement => {
  const rootRef = useRef<HTMLDivElement>(null);

  return (
    <StudioResizableLayoutContext.Provider value={{ orientation }}>
      <div
        className={classes.root}
        ref={rootRef}
        style={{ flexDirection: orientation === 'horizontal' ? 'row' : 'column' }}
      >
        {children}
      </div>
    </StudioResizableLayoutContext.Provider>
  );
};

StudioResizableLayoutRoot.displayName = 'StudioResizableLayout.Root';

export { StudioResizableLayoutRoot };
