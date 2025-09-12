import { StudioTable } from '../../StudioTable';
import type { ForwardedRef, ReactElement } from 'react';
import React from 'react';
import type { StudioCheckboxProps } from '../../StudioCheckbox';
import { StudioCheckbox } from '../../StudioCheckbox';
import { BaseInputCell } from './BaseInputCell';
import { useFormEventProps } from './useFormEventProps';
import type { LabelRequired } from '../../../types/LabelRequired';

export type CellCheckboxProps = LabelRequired<StudioCheckboxProps>;

export class CellCheckbox extends BaseInputCell<HTMLInputElement, CellCheckboxProps> {
  render(
    { className, label, ...rest }: CellCheckboxProps,
    ref: ForwardedRef<HTMLInputElement>,
  ): ReactElement {
    /* eslint-disable react-hooks/rules-of-hooks */
    /* Eslint misinterprets this as a class component, while it's really just a functional component within a class */

    const eventProps = useFormEventProps<HTMLInputElement>(rest);

    return (
      <StudioTable.Cell className={className}>
        <StudioCheckbox aria-label={label} ref={ref} {...rest} {...eventProps} />
      </StudioTable.Cell>
    );
  }

  shouldMoveFocusOnArrowKey = (): boolean => true;

  shouldMoveFocusOnEnterKey = (): boolean => true;
}
