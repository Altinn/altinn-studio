import React, { type ChangeEvent, type ReactElement } from 'react';
import classes from './StudioCheckboxTableHeader.module.css';
import { StudioTable } from '../../StudioTable';
import { StudioCheckbox } from '../../StudioCheckbox';

export type StudioCheckboxTableHeaderProps = {
  title: string;
  checked: boolean;
  indeterminate: boolean;
  disabled?: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

export const StudioCheckboxTableHeader = ({
  title,
  checked,
  indeterminate,
  disabled,
  onChange,
}: StudioCheckboxTableHeaderProps): ReactElement => {
  return (
    <StudioTable.Head>
      <StudioTable.Row>
        <StudioTable.HeaderCell className={classes.header}>
          <StudioCheckbox
            aria-label={title}
            checked={checked}
            indeterminate={indeterminate}
            onChange={onChange}
            aria-checked
            size='sm'
            value='all'
            disabled={disabled}
          />
        </StudioTable.HeaderCell>
        <StudioTable.HeaderCell className={classes.header} aria-hidden>
          {title}
        </StudioTable.HeaderCell>
      </StudioTable.Row>
    </StudioTable.Head>
  );
};
