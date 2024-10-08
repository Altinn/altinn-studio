import { StudioTable } from '../../StudioTable';
import type { ForwardedRef, ReactElement } from 'react';
import React from 'react';
import type { StudioTextfieldProps } from '../../StudioTextfield';
import { StudioTextfield } from '../../StudioTextfield';
import classes from './Cell.module.css';
import { BaseInputCell } from './BaseInputCell';
import cn from 'classnames';

export type CellTextfieldProps = StudioTextfieldProps;

export class CellTextfield extends BaseInputCell<HTMLInputElement, CellTextfieldProps> {
  render(
    { className: givenClass, ...rest }: CellTextfieldProps,
    ref: ForwardedRef<HTMLInputElement>,
  ): ReactElement {
    const className = cn(classes.textfieldCell, givenClass);
    return (
      <StudioTable.Cell className={className}>
        <StudioTextfield hideLabel ref={ref} size='small' {...rest} />
      </StudioTable.Cell>
    );
  }
}
