import { StudioTable } from '../../StudioTable';
import type { ForwardedRef, ReactElement } from 'react';
import React from 'react';
import type { StudioTextfieldProps } from '../../StudioTextfield';
import { StudioTextfield } from '../../StudioTextfield';
import classes from './Cell.module.css';
import { BaseInputCell } from './BaseInputCell';
import cn from 'classnames';
import { isCaretAtEnd, isCaretAtStart, isSomethingSelected } from '../dom-utils/caretUtils';

export type CellTextfieldProps = StudioTextfieldProps;

export class CellTextfield extends BaseInputCell<HTMLInputElement, CellTextfieldProps> {
  render(
    { className: givenClass, ...rest }: CellTextfieldProps,
    ref: ForwardedRef<HTMLInputElement>,
  ): ReactElement {
    const className = cn(classes.textfieldCell, givenClass);
    return (
      <StudioTable.Cell className={className}>
        <StudioTextfield
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
      default:
        return false;
    }
  }
}
