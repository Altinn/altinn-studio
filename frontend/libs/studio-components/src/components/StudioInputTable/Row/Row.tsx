import type { ComponentProps, CSSProperties, RefObject } from 'react';
import React, { forwardRef, useCallback, useLayoutEffect, useRef, useState } from 'react';
import { StudioTable } from '../../StudioTable';
import classes from './Row.module.css';
import { RowContext } from './RowContext';

type RowProps = ComponentProps<typeof StudioTable.Row>;

export const Row = forwardRef<HTMLTableRowElement, RowProps>(
  ({ children, ...rest }, externalRef) => {
    const internalRef = useRef<HTMLTableRowElement>(null);
    const { updateMaxTextareaScrollHeight, rowStyle } = useSyncMaxTextareaScrollHeight(internalRef);

    return (
      <StudioTable.Row style={rowStyle} className={classes.row} ref={internalRef} {...rest}>
        <RowContext.Provider value={{ updateMaxTextareaScrollHeight }}>
          {children}
        </RowContext.Provider>
      </StudioTable.Row>
    );
  },
);

Row.displayName = 'Row';

type UseSyncMaxTextareaScrollHeightResult = {
  updateMaxTextareaScrollHeight: () => void;
  rowStyle: CSSProperties;
};

const useSyncMaxTextareaScrollHeight = (
  ref: RefObject<HTMLTableRowElement>,
): UseSyncMaxTextareaScrollHeightResult => {
  const [maxTextareaScrollHeight, setMaxTextareaScrollHeight] = useState(0);

  const updateMaxTextareaScrollHeight = useCallback(() => {
    const height = findHeightOfTallestTextareaInRow(ref.current);
    setMaxTextareaScrollHeight(height);
  }, [ref]);

  useLayoutEffect(updateMaxTextareaScrollHeight, [updateMaxTextareaScrollHeight]);

  const rowStyle: CSSProperties = {
    [textareaScrollHeightProperty]: `${maxTextareaScrollHeight}px`,
  } as CSSProperties; // Must cast because CSSProperties is not compatible with custom properties

  return { updateMaxTextareaScrollHeight, rowStyle };
};

const textareaScrollHeightProperty = '--row-max-textarea-scrollheight';

function findAllTextareasInRow(row: HTMLTableRowElement): HTMLTextAreaElement[] {
  return Array.from(row.querySelectorAll('textarea'));
}

function findHeightOfTallestTextareaInRow(row: HTMLTableRowElement): number {
  const allTextareas = findAllTextareasInRow(row);
  return findHeightOfTallestTextarea(allTextareas);
}

function findHeightOfTallestTextarea(textares: HTMLTextAreaElement[]): number {
  const heights = textares.map(getTextareaValueHeight);
  return Math.max(...heights);
}

function getTextareaValueHeight(textarea: HTMLTextAreaElement): number {
  textarea.style.height = '0px';
  const { scrollHeight } = textarea;
  textarea.style.height = '';
  return scrollHeight;
}
