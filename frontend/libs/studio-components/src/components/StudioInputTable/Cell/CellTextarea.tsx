import { StudioTable } from '../../StudioTable';
import type { ForwardedRef, ReactElement } from 'react';
import React from 'react';
import classes from './Cell.module.css';
import type { StudioTextareaProps } from '../../StudioTextarea';
import { StudioTextarea } from '../../StudioTextarea';
import { BaseInputCell } from './BaseInputCell';
import cn from 'classnames';

export type CellTextareaProps = StudioTextareaProps;

export class CellTextarea extends BaseInputCell<HTMLTextAreaElement, CellTextareaProps> {
  render(
    { className: givenClass, ...rest }: CellTextareaProps,
    ref: ForwardedRef<HTMLTextAreaElement>,
  ): ReactElement {
    const className = cn(classes.textareaCell, givenClass);
    return (
      <StudioTable.Cell className={className}>
        <StudioTextarea hideLabel ref={ref} size='small' {...rest} />
      </StudioTable.Cell>
    );
  }
}
