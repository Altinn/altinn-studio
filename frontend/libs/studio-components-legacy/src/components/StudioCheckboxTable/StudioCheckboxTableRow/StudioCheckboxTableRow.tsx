import React, { type ReactElement, type ChangeEvent } from 'react';
import classes from './StudioCheckboxTableRow.module.css';
import { type StudioCheckboxTableRowElement } from '../types/StudioCheckboxTableRowElement';
import { StudioTable } from '../../StudioTable';
import { StudioCheckbox } from '../../StudioCheckbox';
import { StudioParagraph } from '../../StudioParagraph';

export type StudioCheckboxTableRowProps = {
  rowElement: StudioCheckboxTableRowElement;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

export const StudioCheckboxTableRow = ({
  rowElement,
  onChange,
}: StudioCheckboxTableRowProps): ReactElement => {
  const { value, label, description, checked, disabled } = rowElement;
  return (
    <StudioTable.Row>
      <StudioTable.Cell className={classes.checkboxCell}>
        <StudioCheckbox
          aria-label={label}
          onChange={onChange}
          size='sm'
          value={value}
          description={description}
          checked={checked}
          disabled={disabled}
        />
      </StudioTable.Cell>
      <StudioTable.Cell className={classes.chexboxTextContent}>
        <StudioParagraph size='sm'>{label}</StudioParagraph>
        {description && (
          <StudioParagraph size='sm' className={classes.descriptionText}>
            {description}
          </StudioParagraph>
        )}
      </StudioTable.Cell>
    </StudioTable.Row>
  );
};
