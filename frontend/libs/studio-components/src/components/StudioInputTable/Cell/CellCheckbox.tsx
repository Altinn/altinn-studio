import { StudioTable } from '../../StudioTable';
import type { ForwardedRef, ReactElement } from 'react';
import React from 'react';
import classes from './Cell.module.css';
import type { StudioCheckboxProps } from '../../StudioCheckbox';
import { StudioCheckbox } from '../../StudioCheckbox';
import { BaseInputCell } from './BaseInputCell';

export type CellCheckboxProps = StudioCheckboxProps;

export class CellCheckbox extends BaseInputCell<HTMLInputElement, CellCheckboxProps> {
  render(props: CellCheckboxProps, ref: ForwardedRef<HTMLInputElement>): ReactElement {
    return (
      <StudioTable.Cell className={classes.cell}>
        <StudioCheckbox ref={ref} {...props} />
      </StudioTable.Cell>
    );
  }

  shouldMoveFocusOnArrowKey = () => true;
}
