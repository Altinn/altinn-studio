import { StudioTable } from '../../StudioTable';
import type { ForwardedRef, ReactElement } from 'react';
import React from 'react';
import type { StudioCheckboxProps } from '../../StudioCheckbox';
import { StudioCheckbox } from '../../StudioCheckbox';
import { BaseInputCell } from './BaseInputCell';

export type CellCheckboxProps = StudioCheckboxProps;

export class CellCheckbox extends BaseInputCell<HTMLInputElement, CellCheckboxProps> {
  render(
    { className, ...rest }: CellCheckboxProps,
    ref: ForwardedRef<HTMLInputElement>,
  ): ReactElement {
    return (
      <StudioTable.Cell className={className}>
        <StudioCheckbox ref={ref} {...rest} />
      </StudioTable.Cell>
    );
  }
}
