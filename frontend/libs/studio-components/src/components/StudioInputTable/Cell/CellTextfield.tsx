import { StudioTable } from '../../StudioTable';
import { FocusEvent, ForwardedRef, ReactElement, useCallback } from 'react';
import React from 'react';
import type { StudioTextfieldProps } from '../../StudioTextfield';
import { StudioTextfield } from '../../StudioTextfield';
import classes from './Cell.module.css';
import { BaseInputCell } from './BaseInputCell';
import cn from 'classnames';
import { isCaretAtEnd, isCaretAtStart, isSomethingSelected } from '../dom-utils/caretUtils';
import { useEventProps } from './useEventProps';

export type CellTextfieldProps = StudioTextfieldProps;

export class CellTextfield extends BaseInputCell<HTMLInputElement, CellTextfieldProps> {
  render(
    { className: givenClass, onFocus, ...rest }: CellTextfieldProps,
    ref: ForwardedRef<HTMLInputElement>,
  ): ReactElement {
    const handleFocus = useCallback(
      (event: FocusEvent<HTMLInputElement>): void => {
        onFocus?.(event);
        event.currentTarget.select();
      },
      [onFocus],
    );

    const eventProps = useEventProps<HTMLInputElement>({ onFocus: handleFocus, ...rest });

    const className = cn(classes.textfieldCell, givenClass);

    return (
      <StudioTable.Cell className={className}>
        <StudioTextfield hideLabel ref={ref} size='small' {...rest} {...eventProps} />
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

  shouldMoveFocusOnEnterKey = () => true;
}
