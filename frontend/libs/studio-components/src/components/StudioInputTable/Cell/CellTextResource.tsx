import { StudioTable } from '../../StudioTable';
import type { ForwardedRef, ReactElement, FocusEvent } from 'react';
import React, { useCallback } from 'react';
import { BaseInputCell } from './BaseInputCell';
import type { StudioTextResourceInputProps } from '../../StudioTextResourceInput';
import { StudioTextResourceInput } from '../../StudioTextResourceInput';
import cn from 'classnames';
import classes from './Cell.module.css';
import { useEventProps } from './useEventProps';
import { isCaretAtEnd, isCaretAtStart, isSomethingSelected } from '../dom-utils/caretUtils';
import { isCombobox } from '../dom-utils/isCombobox';

export type CellTextResourceInputProps = StudioTextResourceInputProps & {
  className?: string;
};

export class CellTextResource extends BaseInputCell<HTMLInputElement, CellTextResourceInputProps> {
  render(
    { className: givenClass, onFocus, ...rest }: CellTextResourceInputProps,
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

    const eventProps = useEventProps<HTMLInputElement>({ onFocus: handleFocus, ...rest });

    const className = cn(classes.textResourceCell, givenClass);

    return (
      <StudioTable.Cell className={className}>
        <StudioTextResourceInput
          currentIdClass={classes.currentTextId}
          inputClass={classes.textInput}
          toggleClass={classes.toggle}
          {...rest}
          {...eventProps}
          ref={ref}
        />
      </StudioTable.Cell>
    );
  }

  shouldMoveFocusOnArrowKey({ key, currentTarget }): boolean {
    if (isSomethingSelected(currentTarget)) return false;
    switch (key) {
      case 'ArrowUp':
        return this.shouldMoveFocusOnArrowUpKey(currentTarget);
      case 'ArrowDown':
        return this.shouldMoveFocusOnArrowDownKey(currentTarget);
      case 'ArrowLeft':
        return this.shouldMoveFocusOnArrowLeftKey(currentTarget);
      case 'ArrowRight':
        return this.shouldMoveFocusOnArrowRightKey(currentTarget);
    }
  }

  private shouldMoveFocusOnArrowUpKey = (element: HTMLInputElement): boolean =>
    !isCombobox(element) && isCaretAtStart(element);

  private shouldMoveFocusOnArrowDownKey = (element: HTMLInputElement): boolean =>
    !isCombobox(element) && isCaretAtEnd(element);

  private shouldMoveFocusOnArrowLeftKey = (element: HTMLInputElement): boolean =>
    isCaretAtStart(element);

  private shouldMoveFocusOnArrowRightKey = (element: HTMLInputElement): boolean =>
    isCaretAtEnd(element);

  shouldMoveFocusOnEnterKey = ({ currentTarget }): boolean => !isCombobox(currentTarget);
}
