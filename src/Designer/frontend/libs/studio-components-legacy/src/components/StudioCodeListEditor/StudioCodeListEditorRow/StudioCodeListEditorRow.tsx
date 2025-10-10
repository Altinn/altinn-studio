import type { CodeListItem } from '../types/CodeListItem';
import type { CodeListItemValue } from '../types/CodeListItemValue';
import { StudioInputTable } from '../../StudioInputTable';
import { TrashIcon } from '../../../../../studio-icons';
import type { FocusEvent, HTMLInputAutoCompleteAttribute, Dispatch } from 'react';
import React, { forwardRef, useCallback, useEffect, useRef } from 'react';
import { changeDescription, changeHelpText, changeLabel, changeValue } from './utils';
import { useStudioCodeListEditorContext } from '../StudioCodeListEditorContext';
import type { ValueError } from '../types/ValueError';
import type { TextResource } from '../../../types/TextResource';
import { CodeListItemTextProperty } from '../types/CodeListItemTextProperty';
import { ReducerActionType } from '../StudioCodeListEditorReducer';
import type { ReducerAction } from '../StudioCodeListEditorReducer';
import type { CreateTextResourceInternalArgs } from '../StudioCodeListEditor';
import classes from './StudioCodeListEditorRow.module.css';

type StudioCodeListEditorRowProps = {
  dispatch: Dispatch<ReducerAction>;
  error: ValueError | null;
  item: CodeListItem;
  number: number;
  onChange: (newItem: CodeListItem) => void;
  onCreateTextResource: (args: CreateTextResourceInternalArgs) => void;
  onDeleteButtonClick: () => void;
  onUpdateCodeListItem: (newItem: CodeListItem) => void;
  onUpdateTextResource: (textResource: TextResource) => void;
  textResources: TextResource[];
};

export function StudioCodeListEditorRow({
  dispatch,
  error,
  item,
  number,
  onChange,
  onDeleteButtonClick,
  onCreateTextResource,
  onUpdateCodeListItem,
  onUpdateTextResource,
  textResources,
}: StudioCodeListEditorRowProps) {
  const { texts } = useStudioCodeListEditorContext();

  const handleValueChange = useCallback(
    (value: CodeListItemValue) => {
      const updatedItem = changeValue(item, value);
      onChange(updatedItem);
    },
    [item, onChange],
  );

  const handleUpdateValue = useCallback(
    (value: CodeListItemValue) => {
      const updatedItem = changeValue(item, value);
      onUpdateCodeListItem(updatedItem);
    },
    [item, onUpdateCodeListItem],
  );

  const handleLabelChange = useCallback(
    (label: string) => {
      const updatedItem = changeLabel(item, label);
      onChange(updatedItem);
      onUpdateCodeListItem(updatedItem);
    },
    [item, onChange, onUpdateCodeListItem],
  );

  const handleDescriptionChange = useCallback(
    (description: string) => {
      const updatedItem = changeDescription(item, description);
      onChange(updatedItem);
      onUpdateCodeListItem(updatedItem);
    },
    [item, onChange, onUpdateCodeListItem],
  );

  const handleHelpTextChange = useCallback(
    (helpText: string) => {
      const updatedItem = changeHelpText(item, helpText);
      onChange(updatedItem);
      onUpdateCodeListItem(updatedItem);
    },
    [item, onChange, onUpdateCodeListItem],
  );

  return (
    <StudioInputTable.Row>
      <TypedInputCell
        autoComplete='off'
        error={error && texts.valueErrors[error]}
        label={texts.itemValue(number)}
        onChange={handleValueChange}
        onUpdateValue={handleUpdateValue}
        value={item.value}
      />
      <TextResourceSelectorCell
        currentId={item.label}
        dispatch={dispatch}
        key={makeKey(CodeListItemTextProperty.Label, item.label)}
        label={texts.itemLabel(number)}
        number={number}
        onChangeCurrentId={handleLabelChange}
        onCreateTextResource={onCreateTextResource}
        onUpdateTextResource={onUpdateTextResource}
        property={CodeListItemTextProperty.Label}
        required={true}
        textResources={textResources}
      />
      <TextResourceSelectorCell
        currentId={item.description}
        dispatch={dispatch}
        key={makeKey(CodeListItemTextProperty.Description, item.description)}
        label={texts.itemDescription(number)}
        number={number}
        onChangeCurrentId={handleDescriptionChange}
        onCreateTextResource={onCreateTextResource}
        onUpdateTextResource={onUpdateTextResource}
        property={CodeListItemTextProperty.Description}
        required={false}
        textResources={textResources}
      />
      <TextResourceSelectorCell
        currentId={item.helpText}
        dispatch={dispatch}
        key={makeKey(CodeListItemTextProperty.HelpText, item.helpText)}
        label={texts.itemHelpText(number)}
        number={number}
        onChangeCurrentId={handleHelpTextChange}
        onCreateTextResource={onCreateTextResource}
        onUpdateTextResource={onUpdateTextResource}
        property={CodeListItemTextProperty.HelpText}
        required={false}
        textResources={textResources}
      />
      <DeleteButtonCell onClick={onDeleteButtonClick} number={number} />
    </StudioInputTable.Row>
  );
}

function makeKey(property: CodeListItemTextProperty, textKey?: string): string {
  return `${property}-${textKey ?? ''}`;
}

type TypedInputCellProps<T extends CodeListItemValue> = {
  value: T;
  label: string;
  onChange: (newValue: T) => void;
  onFocus?: (event: FocusEvent) => void;
  onUpdateValue: (newValue: T) => void;
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
  ({ label, onChange, onUpdateValue, ...rest }, ref) => {
    const handleNumberChange = useCallback(
      (numberValue: number | undefined): void => {
        onChange(numberValue);
      },
      [onChange],
    );

    const handleNumberBlur = useCallback(
      (numberValue: number | undefined): void => {
        onUpdateValue(numberValue);
      },
      [onUpdateValue],
    );

    return (
      <StudioInputTable.Cell.Numberfield
        className={classes.textfieldCell}
        aria-label={label}
        onChange={handleNumberChange}
        onBlurNumber={handleNumberBlur}
        ref={ref}
        {...rest}
      />
    );
  },
);

NumberfieldCell.displayName = 'NumberfieldCell';

const CheckboxCell = forwardRef<HTMLInputElement, TypedInputCellProps<boolean>>(
  ({ value, label, onChange, onUpdateValue, ...rest }, ref) => {
    const handleBooleanChange = useCallback(
      (event: React.ChangeEvent<HTMLInputElement>): void => {
        onChange(event.target.checked);
        onUpdateValue(event.target.checked);
      },
      [onChange, onUpdateValue],
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
  ({ label, onChange, onUpdateValue, ...rest }, ref) => {
    const handleTextChange = useCallback(
      (event: React.ChangeEvent<HTMLInputElement>): void => {
        onChange(event.target.value);
      },
      [onChange],
    );

    const handleTextBlur = useCallback(
      (event: FocusEvent<HTMLInputElement>) => {
        onUpdateValue(event.target.value);
      },
      [onUpdateValue],
    );

    return (
      <StudioInputTable.Cell.Textfield
        className={classes.textfieldCell}
        aria-label={label}
        onChange={handleTextChange}
        onBlur={handleTextBlur}
        ref={ref}
        {...rest}
      />
    );
  },
);

TextfieldCell.displayName = 'TextfieldCell';

type TextResourceIdCellProps = {
  currentId: string;
  dispatch: Dispatch<ReducerAction>;
  label: string;
  number: number;
  onChangeCurrentId: (newId: string) => void;
  onCreateTextResource: (args: CreateTextResourceInternalArgs) => void;
  onUpdateTextResource: (textResource: TextResource) => void;
  property: CodeListItemTextProperty;
  required: boolean;
  textResources: TextResource[];
};

function TextResourceSelectorCell({
  currentId,
  dispatch,
  number,
  onChangeCurrentId,
  onCreateTextResource,
  onUpdateTextResource,
  property,
  required,
  textResources,
}: TextResourceIdCellProps) {
  const {
    texts: { textResourceTexts },
  } = useStudioCodeListEditorContext();

  const handleUpdateTextResource = (newTextResource: TextResource) => {
    onUpdateTextResource(newTextResource);
  };

  const handleChangeTextResource = useCallback(
    (newTextResource: TextResource) => {
      dispatch({
        type: ReducerActionType.UpdateTextResourceValue,
        textResourceId: newTextResource.id,
        newValue: newTextResource.value,
      });
    },
    [dispatch],
  );

  const handleCreateTextResource = useCallback(
    (textResource: TextResource) => {
      const codeItemIndex = number - 1;
      dispatch({
        type: ReducerActionType.AddTextResource,
        textResource,
        codeItemIndex,
        property,
      });
      onCreateTextResource({ textResource, codeItemIndex, property });
    },
    [dispatch, onCreateTextResource, number, property],
  );

  return (
    <StudioInputTable.Cell.TextResource
      currentId={currentId}
      onChangeCurrentId={onChangeCurrentId}
      onChangeTextResource={handleChangeTextResource}
      onCreateTextResource={handleCreateTextResource}
      onUpdateTextResource={handleUpdateTextResource}
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
