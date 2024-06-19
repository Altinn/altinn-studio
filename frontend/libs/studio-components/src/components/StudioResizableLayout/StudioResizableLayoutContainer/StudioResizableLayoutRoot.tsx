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
  // siblingElements: new Map<string, SiblingElements>(),
  // containerFlexGrow: new Map<string, number>(),
});

const StudioResizableLayoutRoot = ({
  children,
  orientation,
}: StudioResizableLayoutRootProps): React.ReactElement => {
  const rootRef = useRef<HTMLDivElement>(null);

  // const childrenRef = useRef([]);
  //
  // useEffect(() => {
  //   childrenRef.current = children.slice(0, children.length).map(() => React.createRef());
  // }, [children]);

  return (
    <StudioResizableLayoutContext.Provider value={{ orientation }}>
      <div
        className={classes.root}
        ref={rootRef}
        style={{ flexDirection: orientation === 'horizontal' ? 'row' : 'column' }}
      >
        {children}
        {/* {children.map((child, i: number) => { */}
        {/*   return React.cloneElement(child, { */}
        {/*     orentation: "vertical", */}
        {/*     key: i, */}
        {/*     ref: (el) => { childrenRef.current[i] = el } */}
        {/*   }); */}
        {/* })} */}
      </div>
    </StudioResizableLayoutContext.Provider>
  );
};

StudioResizableLayoutRoot.displayName = 'StudioResizableLayout.Root';

export { StudioResizableLayoutRoot };
