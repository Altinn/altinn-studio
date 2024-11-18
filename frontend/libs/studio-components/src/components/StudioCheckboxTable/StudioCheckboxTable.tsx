import React, { type ReactNode, type ChangeEvent, type ReactElement } from 'react';
import classes from './StudioCheckboxTable.module.css';
import { StudioTable, type StudioTableProps } from '../StudioTable';
import { StudioCheckbox } from '../StudioCheckbox';
import { StudioParagraph } from '../StudioParagraph';

export type StudioCheckboxTableProps = {} & StudioTableProps;

export const StudioCheckboxTable = ({
  className,
  children,
}: StudioCheckboxTableProps): ReactElement => {
  return <StudioTable className={className}>{children}</StudioTable>;
};

// ------------------------------
export type StudioCheckboxTableHeaderProps = {
  title: string;
  checked: boolean;
  indeterminate: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

export const StudioCheckboxTableHeader = ({
  title,
  checked,
  indeterminate,
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
          />
        </StudioTable.HeaderCell>
        <StudioTable.HeaderCell className={classes.header} aria-hidden>
          {title}
        </StudioTable.HeaderCell>
      </StudioTable.Row>
    </StudioTable.Head>
  );
};

// --------------------
export type StudioCheckboxTableBodyProps = {
  children: ReactNode;
};

export const StudioCheckboxTableBody = ({
  children,
}: StudioCheckboxTableBodyProps): ReactElement => {
  return <StudioTable.Body>{children}</StudioTable.Body>;
};

// --------------------
export type StudioCheckboxTableRowElement = {
  value: string;
  label: string;
  description?: string;
  checked: boolean;
};
export type StudioCheckboxTableRowProps = {
  rowElement: StudioCheckboxTableRowElement;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

export const StudioCheckboxTableRow = ({
  rowElement,
  onChange,
}: StudioCheckboxTableRowProps): ReactElement => {
  const { value, label, description, checked } = rowElement;
  return (
    <StudioTable.Row>
      <StudioTable.Cell className={classes.rowCellContent}>
        <StudioCheckbox
          aria-label={label}
          onChange={onChange}
          size='sm'
          value={value}
          description={description}
          checked={checked}
        />
      </StudioTable.Cell>
      <StudioTable.Cell>
        <StudioParagraph size='sm'>{label}</StudioParagraph>
        {description && <StudioParagraph size='sm'>{description}</StudioParagraph>}
      </StudioTable.Cell>
    </StudioTable.Row>
  );
};
