import { StudioTable } from '../../StudioTable';
import React, { forwardRef, useId } from 'react';
import type { StudioCheckboxProps } from '../../StudioCheckbox';
import { StudioCheckbox } from '../../StudioCheckbox';
import type { HTMLCellInputElement } from '../types/HTMLCellInputElement';
import { getNextInputElement } from '../dom-utils/getNextInputElement';
import type { LabelRequired } from '../../../types/LabelRequired';

export type HeaderCellCheckboxProps = LabelRequired<
  Omit<StudioCheckboxProps, 'value'> & { value?: string }
>;

export const HeaderCellCheckbox = forwardRef<HTMLInputElement, HeaderCellCheckboxProps>(
  ({ value: givenValue, className, label, ...rest }, ref) => {
    const defaultValue = useId();
    const value = givenValue ?? defaultValue;
    return (
      <StudioTable.HeaderCell className={className}>
        <StudioCheckbox
          aria-label={label}
          onKeyDown={handleKeyDown}
          ref={ref}
          value={value}
          {...rest}
        />
      </StudioTable.HeaderCell>
    );
  },
);

HeaderCellCheckbox.displayName = 'HeaderCell.Checkbox';

function handleKeyDown(event: React.KeyboardEvent<HTMLCellInputElement>): void {
  moveFocus(event);
}

function moveFocus(event: React.KeyboardEvent<HTMLCellInputElement>): void {
  const nextElement = getNextElement(event);
  if (nextElement) {
    event.preventDefault();
    nextElement.focus();
  }
}

function getNextElement({
  key,
  currentTarget,
}: React.KeyboardEvent<HTMLCellInputElement>): HTMLCellInputElement | null {
  return getNextInputElement(currentTarget, key);
}
