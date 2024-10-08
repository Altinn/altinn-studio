import { StudioTable } from '../../StudioTable';
import React, { forwardRef, useId } from 'react';
import type { StudioCheckboxProps } from '../../StudioCheckbox';
import { StudioCheckbox } from '../../StudioCheckbox';

export type HeaderCellCheckboxProps = Omit<StudioCheckboxProps, 'value'> & { value?: string };

export const HeaderCellCheckbox = forwardRef<HTMLInputElement, HeaderCellCheckboxProps>(
  ({ value: givenValue, className, ...rest }, ref) => {
    const defaultValue = useId();
    const value = givenValue ?? defaultValue;
    return (
      <StudioTable.HeaderCell className={className}>
        <StudioCheckbox ref={ref} value={value} {...rest} />
      </StudioTable.HeaderCell>
    );
  },
);

HeaderCellCheckbox.displayName = 'HeaderCell.Checkbox';
