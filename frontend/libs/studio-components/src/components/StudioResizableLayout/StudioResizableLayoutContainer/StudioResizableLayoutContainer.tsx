import React, { Children, useEffect, useLayoutEffect, useRef, useState } from 'react';
import classes from './StudioResizableLayoutRoot.module.css';
import { type StudioResizableLayoutElementProps } from './StudioResizableLayoutElement';
import { useResizableFunctions } from '../hooks/useResizableFunctions';

export type StudioResizableOrientation = 'horizontal' | 'vertical';

export type StudioResizableLayoutContainerProps = {
  orientation: StudioResizableOrientation;
  children: React.ReactElement<StudioResizableLayoutElementProps>[];
};

export type StudioResizableLayoutContextProps = {
  orientation: StudioResizableOrientation;
  containerSizes: number[];
  resizeDelta: (index: number, size: number) => void;
  collapse: (index: number) => void;
};

export const StudioResizableLayoutContext =
  React.createContext<Partial<StudioResizableLayoutContextProps>>(undefined);

const StudioResizableLayoutContainer = ({
  children,
  orientation,
}: StudioResizableLayoutContainerProps): React.ReactElement => {
  const elementRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [containerSizes, setContainerSizes] = useState<number[]>([]);
  const { resizeTo, resizeDelta } = useResizableFunctions(
    orientation,
    elementRefs,
    children,
    setContainerSizes,
  );

  const collapse = (index: number) => {
    const collapsedSize = children[index].props.collapsedSize || 0;
    resizeTo(index, collapsedSize);
  };

  useEffect(() => {
    elementRefs.current = elementRefs.current.slice(0, children.length);
  }, [children]);

  return (
    <StudioResizableLayoutContext.Provider
      value={{ resizeDelta, collapse, orientation, containerSizes }}
    >
      <div
        className={classes.root}
        style={{ flexDirection: orientation === 'horizontal' ? 'row' : 'column' }}
      >
        {Children.map(children, (child, index) => {
          const hasNeighbour = index < children.length - 1;
          return React.cloneElement(child, {
            index,
            hasNeighbour,
            ref: (element: HTMLDivElement) => (elementRefs.current[index] = element),
          });
        })}
      </div>
    </StudioResizableLayoutContext.Provider>
  );
};

StudioResizableLayoutContainer.displayName = 'StudioResizableLayout.Container';

export { StudioResizableLayoutContainer as StudioResizableLayoutContainer };
