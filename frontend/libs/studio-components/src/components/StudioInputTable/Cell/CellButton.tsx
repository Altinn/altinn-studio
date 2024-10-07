import { StudioTable } from '../../StudioTable';
import type { ForwardedRef, ReactElement } from 'react';
import React from 'react';
import classes from './Cell.module.css';
import type { StudioButtonProps } from '../../StudioButton';
import { StudioButton } from '../../StudioButton';
import { BaseInputCell } from './BaseInputCell';

export type CellButtonProps = StudioButtonProps;

export class CellButton extends BaseInputCell<HTMLButtonElement, CellButtonProps> {
  render(props: StudioButtonProps, ref: ForwardedRef<HTMLButtonElement>): ReactElement {
    return (
      <StudioTable.Cell className={classes.buttonCell}>
        <StudioButton ref={ref} variant='secondary' {...props} />
      </StudioTable.Cell>
    );
  }
}
