import type { CodeListItem } from '../types/CodeListItem';
import { StudioInputTable } from '../../StudioInputTable';
import { TrashIcon } from '../../../../../studio-icons';
import type {
  FocusEvent,
  HTMLInputAutoCompleteAttribute,
  ReactElement,
  ChangeEventHandler,
} from 'react';
import React, { useCallback, useEffect, useRef } from 'react';
import {
  changeDescription,
  changeHelpText,
  changeLabel,
  changeValue,
  getDescription,
  getHelpText,
  getLabel,
} from './utils';
import { useStudioCodeListEditorContext } from '../StudioCodeListEditorContext';
import type { ValueError } from '../types/ValueError';
import classes from './StudioCodeListEditorRow.module.css';

type StudioCodeListEditorRowProps = {
  error?: ValueError | null;
  item: CodeListItem;
  number: number;
  onDeleteButtonClick: () => void;
  onChangeCodeListItem: (newItem: CodeListItem) => void;
};

export function StudioCodeListEditorRow({
  error,
  item,
  number,
  onDeleteButtonClick,
  onChangeCodeListItem,
}: StudioCodeListEditorRowProps): ReactElement {
  const { language, texts } = useStudioCodeListEditorContext();

  const handleChangeValue = useCallback(
    (value: string) => {
      const updatedItem = changeValue(item, value);
      onChangeCodeListItem(updatedItem);
    },
    [item, onChangeCodeListItem],
  );

  const handleLabelChange = useCallback(
    (label: string) => {
      const updatedItem = changeLabel(item, language, label);
      onChangeCodeListItem(updatedItem);
    },
    [item, language, onChangeCodeListItem],
  );

  const handleDescriptionChange = useCallback(
    (description: string) => {
      const updatedItem = changeDescription(item, language, description);
      onChangeCodeListItem(updatedItem);
    },
    [item, language, onChangeCodeListItem],
  );

  const handleHelpTextChange = useCallback(
    (helpText: string) => {
      const updatedItem = changeHelpText(item, language, helpText);
      onChangeCodeListItem(updatedItem);
    },
    [item, language, onChangeCodeListItem],
  );

  return (
    <StudioInputTable.Row>
      <CodeCell
        autoComplete='off'
        error={error ? texts.valueErrors[error] : undefined}
        label={texts.itemValue(number)}
        onChangeValue={handleChangeValue}
        value={item.value}
      />
      <TextCell
        label={texts.itemLabel(number)}
        onChangeText={handleLabelChange}
        required={true}
        text={getLabel(item, language)}
      />
      <TextCell
        label={texts.itemDescription(number)}
        onChangeText={handleDescriptionChange}
        required={false}
        text={getDescription(item, language)}
      />
      <TextCell
        label={texts.itemHelpText(number)}
        onChangeText={handleHelpTextChange}
        required={false}
        text={getHelpText(item, language)}
      />
      <DeleteButtonCell onClick={onDeleteButtonClick} number={number} />
    </StudioInputTable.Row>
  );
}

type CodeCellProps = {
  autoComplete?: HTMLInputAutoCompleteAttribute;
  error?: string;
  label: string;
  onChangeValue: (newValue: string) => void;
  value: string;
};

function CodeCell({ error, label, onChangeValue, ...rest }: CodeCellProps): ReactElement {
  const ref = useRef<HTMLInputElement>(null);

  useEffect((): void => {
    ref.current?.setCustomValidity(error || '');
  }, [error]);

  const handleChange = useCallback(
    (event: FocusEvent<HTMLInputElement>): void => {
      onChangeValue(event.target.value);
    },
    [onChangeValue],
  );

  const handleFocus = useCallback((event: FocusEvent<HTMLInputElement>): void => {
    event.target.reportValidity();
  }, []);

  return (
    <StudioInputTable.Cell.Textfield
      autoFocus
      className={classes.textfieldCell}
      label={label}
      onChange={handleChange}
      onFocus={handleFocus}
      ref={ref}
      {...rest}
    />
  );
}

type TextCellProps = {
  label: string;
  onChangeText: (newText: string) => void;
  required: boolean;
  text: string;
};

function TextCell({ label, onChangeText, required, text }: TextCellProps): ReactElement {
  const handleChangeText: ChangeEventHandler<HTMLInputElement> = useCallback(
    (event) => onChangeText(event.target.value),
    [onChangeText],
  );

  return (
    <StudioInputTable.Cell.Textfield
      label={label}
      onChange={handleChangeText}
      required={required}
      value={text}
    />
  );
}

type DeleteButtonCellProps = {
  number: number;
  onClick: () => void;
};

function DeleteButtonCell({ onClick, number }: DeleteButtonCellProps): ReactElement {
  const { texts } = useStudioCodeListEditorContext();
  return (
    <StudioInputTable.Cell.Button
      data-color='danger'
      icon={<TrashIcon />}
      onClick={onClick}
      title={texts.deleteItem(number)}
      variant='tertiary'
    />
  );
}
