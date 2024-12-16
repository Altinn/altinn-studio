import { StudioTable } from '../../StudioTable';
import type { ForwardedRef, ReactElement } from 'react';
import React from 'react';
import type { StudioCheckboxProps } from '../../StudioCheckbox';
import { StudioCheckbox } from '../../StudioCheckbox';
import { BaseInputCell } from './BaseInputCell';
import { useFormEventProps } from './useFormEventProps';

export type CellCheckboxProps = StudioCheckboxProps;

export class CellCheckbox extends BaseInputCell<HTMLInputElement, CellCheckboxProps> {
  render(
    { className, ...rest }: CellCheckboxProps,
    ref: ForwardedRef<HTMLInputElement>,
  ): ReactElement {
    /* eslint-disable react-hooks/rules-of-hooks */
    /* Eslint misinterprets this as a class component, while it's really just a functional component within a class */

    const eventProps = useFormEventProps<HTMLInputElement>(rest);

    return (
      <StudioTable.Cell className={className}>
        <StudioCheckbox ref={ref} {...rest} {...eventProps} />
      </StudioTable.Cell>
    );
  }

  shouldMoveFocusOnArrowKey = () => true;

  shouldMoveFocusOnEnterKey = () => true;
}
