import type { ChangeEvent } from 'react';
import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { NameError } from '../../types';
import {
  navigateToType,
  removeSelection,
  setSelectedNode,
} from '../../features/editor/schemaEditorSlice';
import { ReferenceSelectionComponent } from './ReferenceSelectionComponent';
import { getCombinationOptions, getTypeOptions } from './helpers/options';
import {
  Checkbox,
  ErrorMessage,
  FieldSet,
  Select,
  TextArea,
  TextField,
} from '@digdir/design-system-react';
import classes from './ItemDataComponent.module.css';
import { ItemRestrictions } from './ItemRestrictions';
import {
  CombinationKind,
  UiSchemaNode,
  addCombinationItem,
  deleteNode,
  pointerIsDefinition,
  setCombinationType,
  setDescription,
  setPropertyName,
  setRef,
  setTitle,
  setType,
  toggleArrayField,
} from '@altinn/schema-model';
import {
  FieldType,
  ObjectKind,
  combinationIsNullable,
  getChildNodesByPointer,
  getNameFromPointer,
  hasNodePointer,
  replaceLastPointerSegment,
} from '@altinn/schema-model';
import { getDomFriendlyID, isValidName } from '../../utils/ui-schema-utils';
import { Divider } from 'app-shared/primitives';
import { useTranslation } from 'react-i18next';
import { CustomProperties } from '@altinn/schema-editor/components/SchemaInspector/CustomProperties';
import { useDatamodelQuery } from '@altinn/schema-editor/hooks/queries';
import { useDatamodelMutation } from '@altinn/schema-editor/hooks/mutations';

export type IItemDataComponentProps = Omit<UiSchemaNode, 'children'>;

export function ItemDataComponent(props: IItemDataComponentProps) {
  const {
    fieldType,
    pointer,
    title,
    description,
    reference,
    isCombinationItem,
    objectKind,
    isArray,
    custom,
  } = props;
  const dispatch = useDispatch();
  const { data } = useDatamodelQuery();
  const { mutate } = useDatamodelMutation();

  const [itemTitle, setItemItemTitle] = useState<string>(title || '');
  const [nodeName, setNodeName] = useState(getNameFromPointer({ pointer }));

  const [nameError, setNameError] = useState(NameError.NoError);
  const [itemDescription, setItemItemDescription] = useState<string>(description || '');

  const getChildNodes = () =>
    pointer && pointer.endsWith(nodeName) ? getChildNodesByPointer(data, pointer) : [];

  const softValidateName = (nodeNameToValidate: string) => {
    const error = !isValidName(nodeNameToValidate) ? NameError.InvalidCharacter : NameError.NoError;
    setNameError(error);
    return error;
  };
  const hardValidateName = () => {
    const error = softValidateName(nodeName);
    if (error !== NameError.NoError) {
      return error;
    }
    if (hasNodePointer(data, replaceLastPointerSegment(pointer, nodeName))) {
      setNameError(NameError.AlreadyInUse);
      return NameError.AlreadyInUse;
    }
    return error;
  };

  useEffect(() => {
    softValidateName(nodeName);
  }, [nodeName]);

  const onNameChange = ({ target }: ChangeEvent) => {
    const { value } = target as HTMLInputElement;
    setNodeName(value);
  };

  const onChangeRef = (path: string, ref: string) => mutate(setRef(data, { path, ref }));

  const onChangeFieldType = (type: FieldType) => mutate(setType(data, { path: pointer, type }));

  const onChangeNullable = (event: ChangeEvent<HTMLInputElement>): void => {
    const isChecked = event.target.checked;
    if (isChecked) {
      mutate(
        addCombinationItem(data, {
          pointer: pointer,
          props: { fieldType: FieldType.Null },
          callback: (newPointer: string) => dispatch(setSelectedNode(newPointer)),
        })
      );
      return;
    }

    getChildNodes().forEach((childNode: UiSchemaNode) => {
      if (childNode.fieldType === FieldType.Null) {
        mutate(deleteNode(data, childNode.pointer));
        removeSelection(childNode.pointer);
      }
    });
  };

  const onChangeTitle = () => mutate(setTitle(data, { path: pointer, title: itemTitle }));

  const onChangeDescription = () =>
    mutate(setDescription(data, { path: pointer, description: itemDescription }));

  const onGoToDefButtonClick = () => {
    if (reference !== undefined) {
      dispatch(navigateToType({ pointer: reference }));
    }
  };

  const onChangeCombinationType = (value: CombinationKind) =>
    mutate(setCombinationType(data, { path: pointer, type: value }));

  const handleArrayPropertyToggle = () => mutate(toggleArrayField(data, pointer));

  const handleChangeNodeName = () => {
    const error = hardValidateName();
    if (error !== NameError.NoError) {
      return;
    }
    const staleName = getNameFromPointer({ pointer });
    if (staleName !== nodeName) {
      mutate(
        setPropertyName(data, {
          path: pointer,
          name: nodeName,
          callback: (newPointer: string) => dispatch(setSelectedNode(newPointer)),
        })
      );
    }
  };

  const { t } = useTranslation();

  const hasCustomProps = custom !== undefined && Object.keys(custom).length > 0;

  const titleId = getDomFriendlyID(pointer, { suffix: 'title' });
  const descriptionId = getDomFriendlyID(pointer, { suffix: 'description' });

  const nameErrorMessage = {
    [NameError.InvalidCharacter]: t('schema_editor.nameError_invalidCharacter'),
    [NameError.AlreadyInUse]: t('schema_editor.nameError_alreadyInUse'),
    [NameError.NoError]: '',
  }[nameError];

  return (
    <div className={classes.root}>
      {!isCombinationItem && (
        <div>
          <TextField
            aria-describedby='Selected Item Name'
            aria-errormessage={nameErrorMessage}
            aria-label={t('schema_editor.name')}
            aria-placeholder='Name'
            id='selectedItemName'
            label={t('schema_editor.name')}
            onBlur={handleChangeNodeName}
            onChange={onNameChange}
            placeholder='Name'
            value={nodeName}
          />
          {nameError !== NameError.NoError && <ErrorMessage>{nameErrorMessage}</ErrorMessage>}
        </div>
      )}
      {objectKind === ObjectKind.Field && (
        <Select
          label={t('schema_editor.type')}
          onChange={(type: FieldType) => onChangeFieldType(type)}
          options={getTypeOptions(t)}
          value={fieldType as string}
        />
      )}
      {objectKind === ObjectKind.Reference && (
        <ReferenceSelectionComponent
          buttonText={t('schema_editor.go_to_type')}
          emptyOptionLabel={t('schema_editor.choose_type')}
          label={t('schema_editor.reference_to')}
          onChangeRef={onChangeRef}
          onGoToDefButtonClick={onGoToDefButtonClick}
          selectedNode={{ pointer, reference }}
        />
      )}
      {objectKind !== ObjectKind.Combination && !pointerIsDefinition(pointer) && (
        <Checkbox
          checked={isArray}
          label={t('schema_editor.multiple_answers')}
          name='checkedMultipleAnswers'
          onChange={handleArrayPropertyToggle}
        />
      )}
      {objectKind === ObjectKind.Combination && (
        <Select
          label={t('schema_editor.type')}
          onChange={(combination: string) =>
            onChangeCombinationType(combination as CombinationKind)
          }
          options={getCombinationOptions(t)}
          value={fieldType}
        />
      )}
      {objectKind === ObjectKind.Combination && (
        <Checkbox
          checkboxId='multiple-answers-checkbox'
          checked={combinationIsNullable(getChildNodes())}
          label={t('schema_editor.nullable')}
          name='checkedNullable'
          onChange={onChangeNullable}
        />
      )}
      <ItemRestrictions {...props} />
      {hasCustomProps && (
        <>
          <Divider marginless/>
          <CustomProperties path={pointer}/>
        </>
      )}
      <Divider marginless/>
      <FieldSet legend={t('schema_editor.descriptive_fields')} className={classes.fieldSet}>
        <div>
          <TextField
            id={titleId}
            label={t('schema_editor.title')}
            aria-label={t('schema_editor.title')}
            onBlur={onChangeTitle}
            onChange={(e: ChangeEvent) => setItemItemTitle((e.target as HTMLInputElement)?.value)}
            value={itemTitle}
          />
        </div>
        <div>
          <TextArea
            id={descriptionId}
            aria-label={t('schema_editor.description')}
            label={t('schema_editor.description')}
            onBlur={onChangeDescription}
            onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
              setItemItemDescription(event.target.value)
            }
            style={{ height: 100 }}
            value={itemDescription}
          />
        </div>
      </FieldSet>
    </div>
  );
}
