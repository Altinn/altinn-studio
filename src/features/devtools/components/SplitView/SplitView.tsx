/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
import React, { Children, createRef, useEffect, useState } from 'react';

import classes from 'src/features/devtools/components/SplitView/SplitView.module.css';

interface SplitViewProps {
  direction: 'row' | 'column';
  children: React.ReactNode;
}

export const SplitView = ({ direction, children }: SplitViewProps) => {
  const childArray = Children.toArray(children);
  const nPanels = childArray.length;
  const isRow = direction === 'row';
  const [panelRefs, setPanelRefs] = useState<React.RefObject<HTMLDivElement>[]>([]);
  const [sizes, setSizes] = useState<number[]>(Array(childArray.length - 1).fill(100));

  useEffect(() => {
    setPanelRefs((refs) =>
      Array(nPanels)
        .fill(null)
        .map((_, i) => refs[i] || createRef()),
    );
  }, [nPanels]);

  // onMouseDown event that handles resizing the panels
  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>, index: number) => {
    event.preventDefault();
    const { screenX: x1, screenY: y1 } = event;
    const startSize = panelRefs[index + 1].current?.getBoundingClientRect()[isRow ? 'width' : 'height'] ?? sizes[index];

    const handleMouseMove = (event: MouseEvent) => {
      event.preventDefault();
      const { screenX: x2, screenY: y2 } = event;
      const delta = isRow ? x2 - x1 : y2 - y1;
      const nextSizes = [...sizes];
      nextSizes[index] = startSize - delta;
      setSizes(nextSizes);
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp, { once: true });
  };

  return (
    <div
      className={classes.container}
      style={{ flexDirection: direction }}
    >
      {childArray.map((child, index, { length }) => (
        <React.Fragment key={index}>
          <div
            ref={panelRefs[index]}
            className={classes.panel}
            style={{ flexBasis: index > 0 ? `${sizes[index - 1]}px` : 0, flexGrow: index === 0 ? 1 : 0 }}
          >
            {child}
          </div>
          {index < length - 1 && (
            <div
              onMouseDown={(event) => handleMouseDown(event, index)}
              role='separator'
              className={classes.separator}
              style={{ cursor: isRow ? 'ew-resize' : 'ns-resize', flexDirection: direction }}
            >
              <div className={classes.handle} />
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};
