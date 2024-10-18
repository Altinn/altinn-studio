import type { CodeListItem } from '../types/CodeListItem';
import { StudioInputTable } from '../../StudioInputTable';
import { TrashIcon } from '../../../../../studio-icons';
import React, { useCallback } from 'react';
import { changeDescription, changeHelpText, changeLabel, changeValue } from './utils';
import { useStudioCodeListEditorContext } from '../StudioCodeListEditorContext';

type StudioCodeListEditorRowProps = {
  item: CodeListItem;
  number: number;
  onChange: (newItem: CodeListItem) => void;
  onDeleteButtonClick: () => void;
};

export function StudioCodeListEditorRow({
  item,
  number,
  onChange,
  onDeleteButtonClick,
}: StudioCodeListEditorRowProps) {
  const { texts } = useStudioCodeListEditorContext();

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
      const updatedItem = changeValue(item, value);
      onChange(updatedItem);
    },
    [item, onChange],
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
        label={texts.itemValue(number)}
        value={item.value}
        onChange={handleValueChange}
      />
      <TextfieldCell
        label={texts.itemLabel(number)}
        value={item.label}
        onChange={handleLabelChange}
      />
      <TextfieldCell
        label={texts.itemDescription(number)}
        value={item.description}
        onChange={handleDescriptionChange}
      />
      <TextfieldCell
        label={texts.itemHelpText(number)}
        value={item.helpText}
        onChange={handleHelpTextChange}
      />
      <DeleteButtonCell onClick={onDeleteButtonClick} number={number} />
    </StudioInputTable.Row>
  );
}

type TextfieldCellProps = {
  value: string;
  label: string;
  onChange: (newString: string) => void;
};

function TextfieldCell({ label, value, onChange }: TextfieldCellProps) {
  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onChange(event.target.value);
    },
    [onChange],
  );

  return (
    <StudioInputTable.Cell.Textfield aria-label={label} onChange={handleChange} value={value} />
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
