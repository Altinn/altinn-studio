import { StudioTable } from '../../StudioTable';
import type { ForwardedRef, ReactElement } from 'react';
import React from 'react';
import classes from './Cell.module.css';
import type { StudioButtonProps } from '../../StudioButton';
import { StudioButton } from '../../StudioButton';
import { BaseInputCell } from './BaseInputCell';
import cn from 'classnames';
import { useFormEventProps } from './useFormEventProps';

export type CellButtonProps = StudioButtonProps;

export class CellButton extends BaseInputCell<HTMLButtonElement, CellButtonProps> {
  render(
    { className: givenClass, ...rest }: StudioButtonProps,
    ref: ForwardedRef<HTMLButtonElement>,
  ): ReactElement {
    /* eslint-disable react-hooks/rules-of-hooks */
    /* Eslint misinterprets this as a class component, while it's really just a functional component within a class */

    const eventProps = useFormEventProps<HTMLButtonElement>(rest);

    const className = cn(classes.buttonCell, givenClass);

    return (
      <StudioTable.Cell className={className}>
        <StudioButton ref={ref} variant='secondary' {...rest} {...eventProps} />
      </StudioTable.Cell>
    );
  }

  shouldMoveFocusOnArrowKey = () => true;

  shouldMoveFocusOnEnterKey = () => false;
}
