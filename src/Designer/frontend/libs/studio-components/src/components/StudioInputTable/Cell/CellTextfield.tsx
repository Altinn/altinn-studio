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
import type { Override } from '../../../types/Override';
import type { InputProps, TextareaProps } from '@digdir/designsystemet-react';
import type { LabelRequired } from '../../../types/LabelRequired';

// The following typing is necessary to adhere to the typing of The Design System's Textfield component, which can be both <input> and <textarea>.
type TextareaOnlyProps = Omit<StudioTextfieldProps, keyof TextareaProps>;
type OneLineTextfieldProps = Omit<StudioTextfieldProps, keyof TextareaOnlyProps>;
type TextInputProps = Override<
  { type?: Exclude<InputProps['type'], 'checkbox' | 'radio'> },
  InputProps
>;
export type CellTextfieldProps = LabelRequired<Override<TextInputProps, OneLineTextfieldProps>>;

export class CellTextfield extends BaseInputCell<HTMLInputElement, CellTextfieldProps> {
  render(
    { className: givenClass, label, onFocus, ...rest }: CellTextfieldProps,
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
        <StudioTextfield aria-label={label} ref={ref} {...rest} {...eventProps} />
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

  shouldMoveFocusOnEnterKey = (): boolean => true;
}
