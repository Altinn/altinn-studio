import { StudioTable } from '../../StudioTable';
import type { ForwardedRef, ReactElement } from 'react';
import React from 'react';
import type { StudioTextfieldProps } from '../../StudioTextfield';
import { StudioTextfield } from '../../StudioTextfield';
import classes from './Cell.module.css';
import { BaseInputCell } from './BaseInputCell';

export type CellTextfieldProps = StudioTextfieldProps;

export class CellTextfield extends BaseInputCell<HTMLInputElement, CellTextfieldProps> {
  render(props: CellTextfieldProps, ref: ForwardedRef<HTMLInputElement>): ReactElement {
    return (
      <StudioTable.Cell className={classes.textfieldCell}>
        <StudioTextfield hideLabel ref={ref} size='small' {...props} />
      </StudioTable.Cell>
    );
  }
}
