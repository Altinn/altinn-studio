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
  onBlur: (newItem: CodeListItem) => void;
  onDeleteButtonClick: () => void;
};

export function StudioCodeListEditorRow({
  error,
  item,
  number,
  onBlur,
  onDeleteButtonClick,
}: StudioCodeListEditorRowProps) {
  const { texts, codeListType } = useStudioCodeListEditorContext();

  const handleLabelChange = useCallback(
    (label: string) => {
      const updatedItem = changeLabel(item, label);
      onBlur(updatedItem);
    },
    [item, onBlur],
  );

  const handleDescriptionChange = useCallback(
    (description: string) => {
      const updatedItem = changeDescription(item, description);
      onBlur(updatedItem);
    },
    [item, onBlur],
  );

  const handleValueChange = useCallback(
    (value: string) => {
      const coercedValue = coerceValue(value, codeListType);
      if (isNaN(Number(coercedValue))) return;

      const updatedItem = changeValue(item, coercedValue);
      onBlur(updatedItem);
    },
    [item, onBlur, codeListType],
  );

  const handleHelpTextChange = useCallback(
    (helpText: string) => {
      const updatedItem = changeHelpText(item, helpText);
      onBlur(updatedItem);
    },
    [item, onBlur],
  );

  return (
    <StudioInputTable.Row>
      <TextfieldCell
        autoComplete='off'
        error={error && texts.valueErrors[error]}
        label={texts.itemValue(number)}
        onBlur={handleValueChange}
        value={item.value}
      />
      <TextfieldCell
        label={texts.itemLabel(number)}
        onBlur={handleLabelChange}
        value={item.label}
      />
      <TextfieldCell
        label={texts.itemDescription(number)}
        onBlur={handleDescriptionChange}
        value={item.description}
      />
      <TextfieldCell
        label={texts.itemHelpText(number)}
        onBlur={handleHelpTextChange}
        value={item.helpText}
      />
      <DeleteButtonCell onClick={onDeleteButtonClick} number={number} />
    </StudioInputTable.Row>
  );
}

type TextfieldCellProps = {
  error?: string;
  label: string;
  onBlur: (newString: string) => void;
  value: CodeListItemValue;
  autoComplete?: HTMLInputAutoCompleteAttribute;
};

function TextfieldCell({ error, label, value, onBlur, autoComplete }: TextfieldCellProps) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect((): void => {
    ref.current?.setCustomValidity(error || '');
  }, [error]);

  const handleBlur = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      onBlur(event.target.value);
    },
    [onBlur],
  );

  const handleFocus = useCallback((event: FocusEvent<HTMLInputElement>): void => {
    event.target.reportValidity();
  }, []);

  return (
    <StudioInputTable.Cell.Textfield
      aria-label={label}
      autoComplete={autoComplete}
      className={classes.textfieldCell}
      onBlur={handleBlur}
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
