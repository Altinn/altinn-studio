import { StudioTable } from '../../StudioTable';
import type { FocusEvent, ForwardedRef, ReactElement } from 'react';
import { useCallback } from 'react';
import classes from './Cell.module.css';
import { BaseInputCell } from './BaseInputCell';
import cn from 'classnames';
import { isCaretAtEnd, isCaretAtStart, isSomethingSelected } from '../dom-utils/caretUtils';
import type { StudioDecimalInputProps } from '../../StudioDecimalInput';
import { StudioDecimalInput } from '../../StudioDecimalInput';
import { useFormEventProps } from './useFormEventProps';
import type { Override } from '../../../types/Override';
import type { CellTextfieldProps } from './CellTextfield';

// CellTextfieldProps is reused because it already narrows The Design System's Textfield typing to
// the <input> variant, which BaseInputCell requires.
type DecimalProps = Pick<
  StudioDecimalInputProps,
  'onBlurNumber' | 'onChangeNumber' | 'validationErrorMessage' | 'value'
>;

export type CellNumberfieldProps = Override<DecimalProps, CellTextfieldProps>;

export class CellNumberfield extends BaseInputCell<HTMLInputElement, CellNumberfieldProps> {
  render(
    { className: givenClass, label, onFocus, ...rest }: CellNumberfieldProps,
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

    const className = cn(classes.numberfieldCell, givenClass);

    return (
      <StudioTable.Cell className={className}>
        <StudioDecimalInput aria-label={label} ref={ref} {...rest} {...eventProps} />
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
