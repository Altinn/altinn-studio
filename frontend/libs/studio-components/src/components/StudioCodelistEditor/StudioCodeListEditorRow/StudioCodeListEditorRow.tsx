import type { CodeListItem } from '../types/CodeListItem';
import type { CodeListItemValue } from '../types/CodeListItemValue';
import { StudioInputTable } from '../../StudioInputTable';
import { TrashIcon } from '../../../../../studio-icons';
import type { FocusEvent, HTMLInputAutoCompleteAttribute, ReactElement } from 'react';
import React, { forwardRef, useCallback, useEffect, useRef } from 'react';
import { changeDescription, changeHelpText, changeLabel, changeValue } from './utils';
import { useStudioCodeListEditorContext } from '../StudioCodeListEditorContext';
import type { ValueError } from '../types/ValueError';
import classes from './StudioCodeListEditorRow.module.css';
import type { TextResource } from '../../../types/TextResource';
import { CodeListItemTextProperty } from '../types/CodeListItemTextProperty';

type StudioCodeListEditorRowProps = {
  error: ValueError | null;
  item: CodeListItem;
  number: number;
  onChange: (newItem: CodeListItem) => void;
  onChangeTextResource: (newTextResource: TextResource) => void;
  onDeleteButtonClick: () => void;
  textResources?: TextResource[];
};

export function StudioCodeListEditorRow({
  error,
  item,
  number,
  onChange,
  onChangeTextResource,
  onDeleteButtonClick,
  textResources,
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
    (value: CodeListItemValue) => {
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
      <TypedInputCell
        autoComplete='off'
        error={error && texts.valueErrors[error]}
        label={texts.itemValue(number)}
        onChange={handleValueChange}
        value={item.value}
      />
      <TextResourceIdCell
        currentId={item.label}
        label={texts.itemLabel(number)}
        number={number}
        onChangeCurrentId={handleLabelChange}
        onChangeTextResource={onChangeTextResource}
        property={CodeListItemTextProperty.Label}
        required={true}
        textResources={textResources}
      />
      <TextResourceIdCell
        currentId={item.description}
        label={texts.itemDescription(number)}
        number={number}
        onChangeCurrentId={handleDescriptionChange}
        onChangeTextResource={onChangeTextResource}
        property={CodeListItemTextProperty.Description}
        required={false}
        textResources={textResources}
      />
      <TextResourceIdCell
        currentId={item.helpText}
        label={texts.itemHelpText(number)}
        number={number}
        onChangeCurrentId={handleHelpTextChange}
        onChangeTextResource={onChangeTextResource}
        property={CodeListItemTextProperty.HelpText}
        required={false}
        textResources={textResources}
      />
      <DeleteButtonCell onClick={onDeleteButtonClick} number={number} />
    </StudioInputTable.Row>
  );
}

type TypedInputCellProps<T extends CodeListItemValue> = {
  value: T;
  label: string;
  onChange: (newValue: T) => void;
  onFocus?: (event: FocusEvent) => void;
  autoComplete?: HTMLInputAutoCompleteAttribute;
  error?: string;
};

function TypedInputCell({ value, error, ...rest }: TypedInputCellProps<CodeListItemValue>) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect((): void => {
    ref.current?.setCustomValidity(error || '');
  }, [error]);

  const handleFocus = useCallback((event: FocusEvent<HTMLInputElement>): void => {
    event.target.reportValidity();
  }, []);

  switch (typeof value) {
    case 'number':
    case 'object': // StudioDecimalField returns null when the field is cleared
      return <NumberfieldCell value={value} onFocus={handleFocus} ref={ref} {...rest} />;
    case 'boolean':
      return <CheckboxCell value={value} onFocus={handleFocus} ref={ref} {...rest} />;
    default:
      return <TextfieldCell value={value} onFocus={handleFocus} ref={ref} {...rest} />;
  }
}

const NumberfieldCell = forwardRef<HTMLInputElement, TypedInputCellProps<number | undefined>>(
  ({ label, onChange, ...rest }, ref) => {
    const handleNumberChange = useCallback(
      (numberValue: number | undefined): void => {
        onChange(numberValue);
      },
      [onChange],
    );

    return (
      <StudioInputTable.Cell.Numberfield
        className={classes.textfieldCell}
        aria-label={label}
        onChange={handleNumberChange}
        ref={ref}
        {...rest}
      />
    );
  },
);

NumberfieldCell.displayName = 'NumberfieldCell';

const CheckboxCell = forwardRef<HTMLInputElement, TypedInputCellProps<boolean>>(
  ({ value, label, onChange, ...rest }, ref) => {
    const handleBooleanChange = useCallback(
      (event: React.ChangeEvent<HTMLInputElement>): void => {
        onChange(event.target.checked);
      },
      [onChange],
    );

    return (
      <StudioInputTable.Cell.Checkbox
        value={String(value)}
        checked={value}
        aria-label={label}
        onChange={handleBooleanChange}
        ref={ref}
        {...rest}
      />
    );
  },
);

CheckboxCell.displayName = 'CheckboxCell';

const TextfieldCell = forwardRef<HTMLInputElement, TypedInputCellProps<string>>(
  ({ label, onChange, ...rest }, ref) => {
    const handleTextChange = useCallback(
      (event: React.ChangeEvent<HTMLInputElement>): void => {
        onChange(event.target.value);
      },
      [onChange],
    );

    return (
      <StudioInputTable.Cell.Textfield
        className={classes.textfieldCell}
        aria-label={label}
        onChange={handleTextChange}
        ref={ref}
        {...rest}
      />
    );
  },
);

TextfieldCell.displayName = 'TextfieldCell';

type TextResourceIdCellProps = {
  currentId: string;
  label: string;
  number: number;
  onChangeCurrentId: (newId: string) => void;
  onChangeTextResource: (newTextResource: TextResource) => void;
  property: CodeListItemTextProperty;
  required: boolean;
  textResources?: TextResource[];
};

function TextResourceIdCell(props: TextResourceIdCellProps): ReactElement {
  const { currentId, onChangeCurrentId, textResources, label } = props;
  if (textResources) {
    return <TextResourceSelectorCell {...props} textResources={textResources} />;
  } else {
    return <TypedInputCell label={label} onChange={onChangeCurrentId} value={currentId || ''} />;
  }
}

function TextResourceSelectorCell({
  currentId,
  number,
  onChangeCurrentId,
  onChangeTextResource,
  property,
  required,
  textResources,
}: Required<TextResourceIdCellProps>) {
  const {
    texts: { textResourceTexts },
  } = useStudioCodeListEditorContext();
  return (
    <StudioInputTable.Cell.TextResource
      currentId={currentId}
      onChangeCurrentId={onChangeCurrentId}
      onChangeTextResource={onChangeTextResource}
      required={required}
      textResources={textResources}
      texts={textResourceTexts(number, property)}
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
