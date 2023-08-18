import type { ChangeEvent } from 'react';
import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import {
  navigateToType,
  removeSelection,
  setSelectedNode,
} from '../../features/editor/schemaEditorSlice';
import { ReferenceSelectionComponent } from './ReferenceSelectionComponent';
import { getCombinationOptions, getTypeOptions } from './helpers/options';
import { Checkbox, Fieldset, Select, TextArea, TextField } from '@digdir/design-system-react';
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
} from '@altinn/schema-model';
import { getDomFriendlyID } from '../../utils/ui-schema-utils';
import { Divider } from 'app-shared/primitives';
import { useTranslation } from 'react-i18next';
import { CustomProperties } from '@altinn/schema-editor/components/SchemaInspector/CustomProperties';
import { useDatamodelQuery } from '@altinn/schema-editor/hooks/queries';
import { useDatamodelMutation } from '@altinn/schema-editor/hooks/mutations';
import { NameField } from './NameField';

export type IItemDataComponentProps = {
  schemaNode: UiSchemaNode;
};

export function ItemDataComponent({ schemaNode }: IItemDataComponentProps) {
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
  } = schemaNode;
  const dispatch = useDispatch();
  const { data } = useDatamodelQuery();
  const { mutate } = useDatamodelMutation();

  const [itemTitle, setItemItemTitle] = useState<string>(title || '');
  const [nodeName, setNodeName] = useState(getNameFromPointer({ pointer }));

  useEffect(() => {
    setNodeName(getNameFromPointer({ pointer }));
  }, [pointer]);

  const [itemDescription, setItemItemDescription] = useState<string>(description || '');

  const getChildNodes = () =>
    pointer && pointer.endsWith(nodeName) ? getChildNodesByPointer(data, pointer) : [];

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

  const handleChangeNodeName = (newNodeName: string) => {
    mutate(
      setPropertyName(data, {
        path: pointer,
        name: newNodeName,
        callback: (newPointer: string) => dispatch(setSelectedNode(newPointer)),
      })
    );
  };

  const { t } = useTranslation();

  const hasCustomProps = custom !== undefined && Object.keys(custom).length > 0;

  const titleId = getDomFriendlyID(pointer, { suffix: 'title' });
  const descriptionId = getDomFriendlyID(pointer, { suffix: 'description' });

  return (
    <div className={classes.root}>
      {!isCombinationItem && (
        <NameField
          id='selectedItemName'
          label={t('schema_editor.name')}
          handleSave={handleChangeNodeName}
          pointer={pointer}
        />
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
          aria-label={t('schema_editor.multiple_answers')}
          value={t('schema_editor.multiple_answers')}
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
          id='multiple-answers-checkbox'
          checked={combinationIsNullable(getChildNodes())}
          aria-label={t('schema_editor.nullable')}
          value={t('schema_editor.nullable')}
          name='checkedNullable'
          onChange={onChangeNullable}
        />
      )}
      <ItemRestrictions schemaNode={schemaNode} />
      {hasCustomProps && (
        <>
          <Divider marginless />
          <CustomProperties path={pointer} />
        </>
      )}
      <Divider marginless />
      <Fieldset legend={t('schema_editor.descriptive_fields')} className={classes.fieldSet}>
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
      </Fieldset>
    </div>
  );
}
