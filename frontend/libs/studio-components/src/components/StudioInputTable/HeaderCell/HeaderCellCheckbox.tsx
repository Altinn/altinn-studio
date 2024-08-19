import { StudioTable } from '../../StudioTable';
import React, { forwardRef, useId } from 'react';
import type { StudioCheckboxProps } from '../../StudioCheckbox';
import { StudioCheckbox } from '../../StudioCheckbox';
import type { HTMLCellInputElement } from '../types/HTMLCellInputElement';
import { getNextInputElement } from '../dom-utils/getNextInputElement';

export type HeaderCellCheckboxProps = Omit<StudioCheckboxProps, 'value'> & { value?: string };

export const HeaderCellCheckbox = forwardRef<HTMLInputElement, HeaderCellCheckboxProps>(
  (props, ref) => {
    const value = useId();
    return (
      <StudioTable.HeaderCell>
        <StudioCheckbox
          onKeyDown={handleKeyDown}
          ref={ref}
          size='small'
          tabIndex={-1}
          value={value}
          {...props}
        />
      </StudioTable.HeaderCell>
    );
  },
);

HeaderCellCheckbox.displayName = 'HeaderCell.Checkbox';

function handleKeyDown(event: React.KeyboardEvent<HTMLCellInputElement>): void {
  moveFocus(event);
}

function moveFocus(event: React.KeyboardEvent<HTMLCellInputElement>) {
  const nextElement = getNextElement(event);
  if (nextElement) {
    event.preventDefault();
    nextElement.tabIndex = 0;
    nextElement.focus();
    event.currentTarget.tabIndex = -1;
  }
}

function getNextElement({
  key,
  currentTarget,
}: React.KeyboardEvent<HTMLCellInputElement>): HTMLCellInputElement | null {
  return getNextInputElement(currentTarget, key);
}
