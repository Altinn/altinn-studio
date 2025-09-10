import { StudioTable } from '../../StudioTable';
import type { FocusEvent, ForwardedRef, ReactElement } from 'react';
import React, { useCallback } from 'react';
import classes from './Cell.module.css';
import type { StudioTextareaProps } from '../../StudioTextarea';
import { StudioTextarea } from '../../StudioTextarea';
import { BaseInputCell } from './BaseInputCell';
import cn from 'classnames';
import { isCaretAtEnd, isCaretAtStart, isSomethingSelected } from '../dom-utils/caretUtils';
import { useFormEventProps } from './useFormEventProps';

export type CellTextareaProps = StudioTextareaProps;

export class CellTextarea extends BaseInputCell<HTMLTextAreaElement, CellTextareaProps> {
  render(
    { className: givenClass, onFocus, ...rest }: CellTextareaProps,
    ref: ForwardedRef<HTMLTextAreaElement>,
  ): ReactElement {
    /* eslint-disable react-hooks/rules-of-hooks */
    /* Eslint misinterprets this as a class component, while it's really just a functional component within a class */

    const handleFocus = useCallback(
      (event: FocusEvent<HTMLTextAreaElement>): void => {
        onFocus?.(event);
        event.currentTarget.select();
      },
      [onFocus],
    );

    const eventProps = useFormEventProps<HTMLTextAreaElement>({ onFocus: handleFocus, ...rest });

    const className = cn(classes.textareaCell, givenClass);
    return (
      <StudioTable.Cell className={className}>
        <StudioTextarea hideLabel ref={ref} {...rest} {...eventProps} />
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
        /* istanbul ignore next */ throw new Error(`Unhandled key: ${key}`);
    }
  }

  shouldMoveFocusOnEnterKey = (): boolean => false;
}
