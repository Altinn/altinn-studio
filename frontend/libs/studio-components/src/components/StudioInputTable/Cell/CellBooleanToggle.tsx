import React from 'react';
import { StudioTable } from '../../StudioTable';
import type { FocusEvent, ForwardedRef, ReactElement } from 'react';
import type { StudioBooleanToggleGroupProps } from '../../StudioBooleanToggleGroup';
import { StudioBooleanToggleGroup } from '../../StudioBooleanToggleGroup';
import { BaseInputCell } from './BaseInputCell';
import { useEventProps } from './useEventProps';

export type CellBooleanToggleProps = StudioBooleanToggleGroupProps;

export class CellBooleanToggle extends BaseInputCell<HTMLDivElement, CellBooleanToggleProps> {
  render(
    { className, trueLabel, falseLabel, ...rest }: CellBooleanToggleProps,
    ref: ForwardedRef<HTMLDivElement>,
  ): ReactElement {
    /* eslint-disable react-hooks/rules-of-hooks */
    /* Eslint misinterprets this as a class component, while it's really just a functional component within a class */

    const eventProps = useEventProps<FocusEvent, FocusEvent, boolean>(rest);

    return (
      <StudioTable.Cell className={className}>
        <StudioBooleanToggleGroup
          ref={ref}
          trueLabel={trueLabel}
          falseLabel={falseLabel}
          {...rest}
          {...eventProps}
        />
      </StudioTable.Cell>
    );
  }

  shouldMoveFocusOnArrowKey = () => true;

  shouldMoveFocusOnEnterKey = () => false;
}
