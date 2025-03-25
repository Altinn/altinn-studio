import type { CSSProperties, ReactElement } from 'react';
import React, { Children, useEffect, useRef } from 'react';
import classes from './StudioResizableLayoutContainer.module.css';
import { type StudioResizableLayoutElementProps } from '../StudioResizableLayoutElement/StudioResizableLayoutElement';
import { useStudioResizableLayoutFunctions } from '../hooks/useStudioResizableFunctions';
import { useTrackContainerSizes } from '../hooks/useTrackContainerSizes';
import { StudioResizableLayoutContext } from '../context/StudioResizableLayoutContext';

export const ORIENTATIONS = ['horizontal', 'vertical'] as const;
export type StudioResizableOrientation = (typeof ORIENTATIONS)[number];
export const horizontal: StudioResizableOrientation = 'horizontal';
export const vertical: StudioResizableOrientation = 'vertical';

export type StudioResizableLayoutContainerProps = {
  localStorageContext?: string;
  orientation: StudioResizableOrientation;
  style?: CSSProperties;

  children: ReactElement<StudioResizableLayoutElementProps>[];
};

const StudioResizableLayoutContainer = ({
  children,
  orientation,
  localStorageContext = 'default',
  style,
}: StudioResizableLayoutContainerProps): ReactElement => {
  const elementRefs = useRef<(HTMLDivElement | null)[]>([]);
  useEffect(() => {
    elementRefs.current = elementRefs.current.slice(0, getValidChildren(children).length);
  }, [children]);

  const { containerSizes, setContainerSizes } = useTrackContainerSizes(localStorageContext);
  const { resizeTo, resizeDelta } = useStudioResizableLayoutFunctions(
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

  const flexDirectionClass = orientation === 'horizontal' ? classes.horizontal : classes.vertical;

  return (
    <StudioResizableLayoutContext.Provider
      value={{ resizeDelta, resizeTo, orientation, containerSizes }}
    >
      <div className={`${classes.root} ${flexDirectionClass}`} style={{ ...style }}>
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
  return children.filter((child) => !!child);
};

StudioResizableLayoutContainer.displayName = 'StudioResizableLayout.Container';

export { StudioResizableLayoutContainer as StudioResizableLayoutContainer };
