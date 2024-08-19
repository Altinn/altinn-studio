import { StudioTable } from '../../StudioTable';
import type { ForwardedRef, ReactElement } from 'react';
import React, { useContext } from 'react';
import classes from './Cell.module.css';
import type { StudioTextareaProps } from '../../StudioTextarea';
import { StudioTextarea } from '../../StudioTextarea';
import { RowContext } from '../Row/RowContext';
import { BaseInputCell } from './BaseInputCell';
import { isCaretAtEnd, isCaretAtStart, isSomethingSelected } from '../dom-utils/caretUtils';

export type CellTextareaProps = StudioTextareaProps;

export class CellTextarea extends BaseInputCell<HTMLTextAreaElement, CellTextareaProps> {
  render(props: CellTextareaProps, ref: ForwardedRef<HTMLTextAreaElement>): ReactElement {
    const rowContext = useContext(RowContext); // eslint-disable-line react-hooks/rules-of-hooks
    const updateTextareaHeights = () => rowContext.updateMaxTextareaScrollHeight();

    return (
      <StudioTable.Cell className={classes.cell + ' ' + classes.textareaCell}>
        <StudioTextarea
          hideLabel
          onFocus={(event) => event.currentTarget.select()}
          onInput={updateTextareaHeights}
          ref={ref}
          size='small'
          {...props}
        />
      </StudioTable.Cell>
    );
  }

  shouldMoveFocusOnArrowKey({ key, currentTarget }) {
    if (isSomethingSelected(currentTarget)) return false;
    switch (key) {
      case 'ArrowUp':
        return isCaretAtStart(currentTarget);
      case 'ArrowDown':
        return isCaretAtEnd(currentTarget);
      case 'ArrowLeft':
        return isCaretAtStart(currentTarget);
      case 'ArrowRight':
        return isCaretAtEnd(currentTarget);
      default:
        return false;
    }
  }
}
