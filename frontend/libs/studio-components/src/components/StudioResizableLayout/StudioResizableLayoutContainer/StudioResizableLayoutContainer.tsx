import React, { Children, useEffect, useRef } from 'react';
import classes from './StudioResizableLayoutContainer.module.css';
import { type StudioResizableLayoutElementProps } from '../StudioResizableLayoutElement/StudioResizableLayoutElement';
import { useStudioResizableLayoutFunctions } from '../hooks/useStudioResizableFunctions';
import { useTrackContainerSizes } from '../hooks/useTrackContainerSizes';
import { StudioResizableLayoutContext } from '../context/StudioResizableLayoutContext';

export type StudioResizableOrientation = 'horizontal' | 'vertical';

export type StudioResizableLayoutContainerProps = {
  layoutId: string;
  orientation: StudioResizableOrientation;
  children: React.ReactElement<StudioResizableLayoutElementProps>[];
  /*localStorageContext?: string;*/
  style?: React.CSSProperties;
};

const StudioResizableLayoutContainer = ({
  layoutId,
  children,
  orientation,
  // localStorageContext = "default",
  style,
}: StudioResizableLayoutContainerProps): React.ReactElement => {
  const elementRefs = useRef<(HTMLDivElement | null)[]>([]);
  useEffect(() => {
    elementRefs.current = elementRefs.current.slice(0, getValidChildren(children).length);
  }, [children]);

  const { containerSizes, setContainerSizes } = useTrackContainerSizes(layoutId);
  const { resizeTo, resizeDelta, collapse } = useStudioResizableLayoutFunctions(
    orientation,
    elementRefs,
    getValidChildren(children),
    (index, size) => setContainerSizes((prev) => ({ ...prev, [index]: size })),
  );

  const renderChildren = () => {
    return Children.map(getValidChildren(children), (child, index) => {
      const hasNeighbour = index < getValidChildren(children).length - 1;
      return React.cloneElement(child, {
        index,
        hasNeighbour,
        ref: (element: HTMLDivElement) => (elementRefs.current[index] = element),
      });
    });
  };

  return (
    <StudioResizableLayoutContext.Provider
      value={{ resizeDelta, resizeTo, collapse, orientation, containerSizes }}
    >
      <div
        className={classes.root}
        style={{ ...style, flexDirection: orientation === 'horizontal' ? 'row' : 'column' }}
      >
        {renderChildren()}
      </div>
    </StudioResizableLayoutContext.Provider>
  );
};

const getValidChildren = (
  children: React.ReactElement<
    StudioResizableLayoutElementProps,
    string | React.JSXElementConstructor<any>
  >[],
) => {
  return Children.map(children, (child) => {
    if (!child) {
      return;
    }
    return child;
  }).filter((child) => !!child);
};

StudioResizableLayoutContainer.displayName = 'StudioResizableLayout.Container';

export { StudioResizableLayoutContainer as StudioResizableLayoutContainer };
