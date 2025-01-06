import { StudioTable } from '../../StudioTable';
import type { FocusEvent, ForwardedRef, ReactElement } from 'react';
import React, { useCallback } from 'react';
import classes from './Cell.module.css';
import { BaseInputCell } from './BaseInputCell';
import cn from 'classnames';
import { isCaretAtEnd, isCaretAtStart, isSomethingSelected } from '../dom-utils/caretUtils';
import type { StudioDecimalInputProps } from '../../StudioDecimalInput';
import { StudioDecimalInput } from '../../StudioDecimalInput';
import { useEventProps } from './useEventProps';

export type CellNumberfieldProps = StudioDecimalInputProps;

export class CellNumberfield extends BaseInputCell<HTMLInputElement, StudioDecimalInputProps> {
  render(
    { className: givenClass, onFocus, ...rest }: CellNumberfieldProps,
    ref: ForwardedRef<HTMLInputElement>,
  ): ReactElement {
    /* eslint-disable react-hooks/rules-of-hooks */
    /* Eslint misinterprets this as a class component, while it's really just a functional component within a class */

    const handleFocus = useCallback(
      (event: FocusEvent<HTMLInputElement>): void => {
        onFocus?.(event);
        event.currentTarget.select();
      },
      [onFocus],
    );

    const eventProps = useEventProps<FocusEvent, FocusEvent, number>({
      onFocus: handleFocus,
      ...rest,
    });

    const className = cn(classes.numberCell, givenClass);

    return (
      <StudioTable.Cell className={className}>
        <StudioDecimalInput hideLabel ref={ref} size='small' {...rest} {...eventProps} />
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
