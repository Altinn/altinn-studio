import { StudioTable } from '../../StudioTable';
import type { ForwardedRef, ReactElement } from 'react';
import React from 'react';
import classes from './Cell.module.css';
import type { StudioTextareaProps } from '../../StudioTextarea';
import { StudioTextarea } from '../../StudioTextarea';
import { BaseInputCell } from './BaseInputCell';
import cn from 'classnames';
import { isCaretAtEnd, isCaretAtStart, isSomethingSelected } from '../dom-utils/caretUtils';

export type CellTextareaProps = StudioTextareaProps;

export class CellTextarea extends BaseInputCell<HTMLTextAreaElement, CellTextareaProps> {
  render(
    { className: givenClass, ...rest }: CellTextareaProps,
    ref: ForwardedRef<HTMLTextAreaElement>,
  ): ReactElement {
    const className = cn(classes.textareaCell, givenClass);
    return (
      <StudioTable.Cell className={className}>
        <StudioTextarea
          hideLabel
          onFocus={(event) => event.currentTarget.select()}
          ref={ref}
          size='small'
          {...rest}
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
    }
  }

  shouldMoveFocusOnEnterKey = () => false;
}
