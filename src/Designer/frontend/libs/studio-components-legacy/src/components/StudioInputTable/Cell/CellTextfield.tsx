import { StudioTable } from '../../StudioTable';
import type { FocusEvent, ForwardedRef, ReactElement } from 'react';
import React, { useCallback } from 'react';

import type { StudioTextfieldProps } from '../../StudioTextfield';
import { StudioTextfield } from '../../StudioTextfield';
import classes from './Cell.module.css';
import { BaseInputCell } from './BaseInputCell';
import cn from 'classnames';
import { isCaretAtEnd, isCaretAtStart, isSomethingSelected } from '../dom-utils/caretUtils';
import { useFormEventProps } from './useFormEventProps';

export type CellTextfieldProps = StudioTextfieldProps;

export class CellTextfield extends BaseInputCell<HTMLInputElement, CellTextfieldProps> {
  render(
    { className: givenClass, onFocus, ...rest }: CellTextfieldProps,
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

    const eventProps = useFormEventProps<HTMLInputElement>({ onFocus: handleFocus, ...rest });

    const className = cn(classes.textfieldCell, givenClass);

    return (
      <StudioTable.Cell className={className}>
        <StudioTextfield hideLabel ref={ref} {...rest} {...eventProps} />
      </StudioTable.Cell>
    );
  }

  shouldMoveFocusOnArrowKey({ key, currentTarget }): boolean {
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
        throw new Error(`Unhandled key: ${key}`);
    }
  }

  shouldMoveFocusOnEnterKey = (): boolean => true;
}
