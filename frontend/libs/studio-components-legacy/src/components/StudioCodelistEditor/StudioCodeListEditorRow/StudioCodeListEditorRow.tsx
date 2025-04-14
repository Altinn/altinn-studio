import type { CodeList } from '../types/CodeList';
import type { CodeListItem } from '../types/CodeListItem';
import type { CodeListItemValue } from '../types/CodeListItemValue';
import { StudioInputTable } from '../../StudioInputTable';
import { TrashIcon } from '../../../../../studio-icons';
import type { FocusEvent, HTMLInputAutoCompleteAttribute, ReactElement, Dispatch } from 'react';
import React, { forwardRef, useCallback, useEffect, useRef } from 'react';
import { changeDescription, changeHelpText, changeLabel, changeValue } from './utils';
import { useStudioCodeListEditorContext } from '../StudioCodeListEditorContext';
import type { ValueError } from '../types/ValueError';
import type { TextResource } from '../../../types/TextResource';
import { CodeListItemTextProperty } from '../types/CodeListItemTextProperty';
import { ReducerActionType } from '../StudioCodeListEditorReducer';
import type { ReducerAction } from '../StudioCodeListEditorReducer';
import classes from './StudioCodeListEditorRow.module.css';

type StudioCodeListEditorRowProps = {
  error: ValueError | null;
  item: CodeListItem;
  number: number;
  onBlurTextResource: (textResource: TextResource) => void;
  onChange: (newItem: CodeListItem) => void;
  onChangeTextResource: (textResource: TextResource) => void;
  onDeleteButtonClick: () => void;
  textResources: TextResource[];
  onCreateTextResource: (newTextResource: TextResource) => void;
  onUpdateTextResource: (textResource: TextResource) => void;
  onUpdateCodeList: (codeList: CodeList) => void;
  dispatch: Dispatch<ReducerAction>;
};

export function StudioCodeListEditorRow({
  error,
  item,
  number,
  onBlurTextResource,
  onChange,
  onChangeTextResource,
  onDeleteButtonClick,
  textResources,
  onCreateTextResource,
  onUpdateTextResource,
  onUpdateCodeList,
  dispatch,
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
        onBlurTextResource={onBlurTextResource}
        onChangeCurrentId={handleLabelChange}
        onChangeTextResource={onChangeTextResource}
        property={CodeListItemTextProperty.Label}
        required={true}
        textResources={textResources}
        onCreateTextResource={onCreateTextResource}
        onUpdateTextResource={onUpdateTextResource}
        onUpdateCodeList={onUpdateCodeList}
        dispatch={dispatch}
      />
      <TextResourceIdCell
        currentId={item.description}
        label={texts.itemDescription(number)}
        number={number}
        onBlurTextResource={onBlurTextResource}
        onChangeCurrentId={handleDescriptionChange}
        onChangeTextResource={onChangeTextResource}
        property={CodeListItemTextProperty.Description}
        required={false}
        textResources={textResources}
        onCreateTextResource={onCreateTextResource}
        onUpdateTextResource={onUpdateTextResource}
        onUpdateCodeList={onUpdateCodeList}
        dispatch={dispatch}
      />
      <TextResourceIdCell
        currentId={item.helpText}
        label={texts.itemHelpText(number)}
        number={number}
        onBlurTextResource={onBlurTextResource}
        onChangeCurrentId={handleHelpTextChange}
        onChangeTextResource={onChangeTextResource}
        property={CodeListItemTextProperty.HelpText}
        required={false}
        textResources={textResources}
        onCreateTextResource={onCreateTextResource}
        onUpdateTextResource={onUpdateTextResource}
        onUpdateCodeList={onUpdateCodeList}
        dispatch={dispatch}
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
  onBlurTextResource: (textResource: TextResource) => void;
  onChangeCurrentId: (newId: string) => void;
  onChangeTextResource: (textResource: TextResource) => void;
  property: CodeListItemTextProperty;
  required: boolean;
  textResources: TextResource[];
  onCreateTextResource: (textResource: TextResource) => void;
  onUpdateTextResource: (textResource: TextResource) => void;
  onUpdateCodeList: (codeList: CodeList) => void;
  dispatch: Dispatch<ReducerAction>;
};

function TextResourceIdCell(props: TextResourceIdCellProps): ReactElement {
  const { currentId, onChangeCurrentId, textResources, label } = props;
  if (textResources.length !== 0) {
    return <TextResourceSelectorCell {...props} textResources={textResources} />;
  } else {
    return <TypedInputCell label={label} onChange={onChangeCurrentId} value={currentId || ''} />;
  }
}

function TextResourceSelectorCell({
  currentId,
  number,
  onBlurTextResource,
  onChangeCurrentId,
  onChangeTextResource,
  property,
  required,
  textResources,
  onCreateTextResource,
  onUpdateTextResource,
  onUpdateCodeList,
  dispatch,
}: Required<TextResourceIdCellProps>) {
  const {
    texts: { textResourceTexts },
  } = useStudioCodeListEditorContext();

  const handleCreateTextResource = useCallback(
    (textResource: TextResource) => {
      dispatch({
        type: ReducerActionType.AddTextResource,
        textResource: textResource,
        codeItemIndex: number - 1,
        property,
        onCreateTextResource: onCreateTextResource,
        onUpdateCodeList: onUpdateCodeList,
      });
    },
    [dispatch, onCreateTextResource, number, property, onUpdateCodeList],
  );

  const handleUpdateTextResource = useCallback(
    (textResource: TextResource) => {
      dispatch({
        type: ReducerActionType.UpdateTextResourceValue,
        textResourceId: textResource.id,
        newValue: textResource.value,
        onUpdateTextResource: onUpdateTextResource,
      });
    },
    [dispatch, onUpdateTextResource],
  );

  return (
    <StudioInputTable.Cell.TextResource
      currentId={currentId}
      onBlurTextResource={onBlurTextResource}
      onChangeCurrentId={onChangeCurrentId}
      onChangeTextResource={onChangeTextResource}
      required={required}
      textResources={textResources}
      texts={textResourceTexts(number, property)}
      onCreateTextResource={handleCreateTextResource}
      onUpdateTextResource={handleUpdateTextResource}
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
