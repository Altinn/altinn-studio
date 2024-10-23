import { StudioTable } from '../../StudioTable';
import type { ForwardedRef, ReactElement } from 'react';
import React from 'react';
import type { StudioCheckboxProps } from '../../StudioCheckbox';
import { StudioCheckbox } from '../../StudioCheckbox';
import { BaseInputCell } from './BaseInputCell';
import { useEventProps } from './useEventProps';

export type CellCheckboxProps = StudioCheckboxProps;

export class CellCheckbox extends BaseInputCell<HTMLInputElement, CellCheckboxProps> {
  render(
    { className, ...rest }: CellCheckboxProps,
    ref: ForwardedRef<HTMLInputElement>,
  ): ReactElement {
    const eventProps = useEventProps<HTMLInputElement>(rest);

    return (
      <StudioTable.Cell className={className}>
        <StudioCheckbox ref={ref} {...rest} {...eventProps} />
      </StudioTable.Cell>
    );
  }

  shouldMoveFocusOnArrowKey = () => true;

  shouldMoveFocusOnEnterKey = () => true;
}
