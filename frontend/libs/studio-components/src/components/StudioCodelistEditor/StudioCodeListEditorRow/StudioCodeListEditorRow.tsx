import type { CodeListItem } from '../types/CodeListItem';
import type { CodeListItemValue } from '../types/CodeListItemValue';
import { StudioInputTable } from '../../StudioInputTable';
import { TrashIcon } from '../../../../../studio-icons';
import type { FocusEvent, HTMLInputAutoCompleteAttribute } from 'react';
import React, { useCallback, useEffect, useRef } from 'react';
import { changeDescription, changeHelpText, changeLabel, changeValue, coerceValue } from './utils';
import { useStudioCodeListEditorContext } from '../StudioCodeListEditorContext';
import type { ValueError } from '../types/ValueError';
import classes from './StudioCodeListEditorRow.module.css';

type StudioCodeListEditorRowProps = {
  error: ValueError | null;
  item: CodeListItem;
  number: number;
  onChange: (newItem: CodeListItem) => void;
  onDeleteButtonClick: () => void;
};

export function StudioCodeListEditorRow({
  error,
  item,
  number,
  onChange,
  onDeleteButtonClick,
}: StudioCodeListEditorRowProps) {
  const { texts, codeListType } = useStudioCodeListEditorContext();

  const handleLabelChange = useCallback(
    (label: string) => {
      const updatedItem = changeLabel(item, label);
      onChange(updatedItem);
    },
    [item, onChange],
  );

  const handleDescriptionChange = useCallback(
    (description: string) => {
      const updatedItem = changeDescription(item, description);
      onChange(updatedItem);
    },
    [item, onChange],
  );

  const handleValueChange = useCallback(
    (value: string) => {
      const coercedValue = coerceValue(value, codeListType);
      if (isNaN(coercedValue)) return;

      const updatedItem = changeValue(item, coercedValue);
      onChange(updatedItem);
    },
    [item, onChange, codeListType],
  );

  const handleHelpTextChange = useCallback(
    (helpText: string) => {
      const updatedItem = changeHelpText(item, helpText);
      onChange(updatedItem);
    },
    [item, onChange],
  );

  return (
    <StudioInputTable.Row>
      <TextfieldCell
        autoComplete='off'
        error={error && texts.valueErrors[error]}
        label={texts.itemValue(number)}
        onChange={handleValueChange}
        value={item.value}
      />
      <TextfieldCell
        label={texts.itemLabel(number)}
        onChange={handleLabelChange}
        value={item.label}
      />
      <TextfieldCell
        label={texts.itemDescription(number)}
        onChange={handleDescriptionChange}
        value={item.description}
      />
      <TextfieldCell
        label={texts.itemHelpText(number)}
        onChange={handleHelpTextChange}
        value={item.helpText}
      />
      <DeleteButtonCell onClick={onDeleteButtonClick} number={number} />
    </StudioInputTable.Row>
  );
}

type TextfieldCellProps = {
  error?: string;
  label: string;
  onChange: (newString: string) => void;
  value: CodeListItemValue;
  autoComplete?: HTMLInputAutoCompleteAttribute;
};

function TextfieldCell({ error, label, value, onChange, autoComplete }: TextfieldCellProps) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect((): void => {
    ref.current?.setCustomValidity(error || '');
  }, [error]);

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      onChange(event.target.value);
    },
    [onChange],
  );

  const handleFocus = useCallback((event: FocusEvent<HTMLInputElement>): void => {
    event.target.reportValidity();
  }, []);

  return (
    <StudioInputTable.Cell.Textfield
      aria-label={label}
      autoComplete={autoComplete}
      className={classes.textfieldCell}
      onChange={handleChange}
      onFocus={handleFocus}
      ref={ref}
      value={(value as string) ?? ''}
    />
  );
}

type DeleteButtonCellProps = {
  number: number;
  onClick: () => void;
};

function DeleteButtonCell({ onClick, number }: DeleteButtonCellProps) {
  const { texts } = useStudioCodeListEditorContext();
  return (
    <StudioInputTable.Cell.Button
      icon={<TrashIcon />}
      color='danger'
      onClick={onClick}
      title={texts.deleteItem(number)}
    />
  );
}
