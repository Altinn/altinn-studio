import { StudioTable } from '../../StudioTable';
import type { ForwardedRef, ReactElement } from 'react';
import React from 'react';
import classes from './Cell.module.css';
import type { StudioTextareaProps } from '../../StudioTextarea';
import { StudioTextarea } from '../../StudioTextarea';
import { BaseInputCell } from './BaseInputCell';

export type CellTextareaProps = StudioTextareaProps;

export class CellTextarea extends BaseInputCell<HTMLTextAreaElement, CellTextareaProps> {
  render(props: CellTextareaProps, ref: ForwardedRef<HTMLTextAreaElement>): ReactElement {
    return (
      <StudioTable.Cell className={classes.textareaCell}>
        <StudioTextarea hideLabel ref={ref} size='small' {...props} />
      </StudioTable.Cell>
    );
  }
}
