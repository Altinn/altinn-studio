import type { ChangeEvent } from 'react';
import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import {
  navigateToType,
  removeSelection,
  setSelectedNode,
} from '../../features/editor/schemaEditorSlice';
import { ReferenceSelectionComponent } from './ReferenceSelectionComponent';
import { getCombinationOptions } from './helpers/options';
import { Fieldset, Select, LegacyTextArea, Textfield, Switch } from '@digdir/design-system-react';
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
import { NameField } from './NameField';
import { useSchemaEditorAppContext } from '@altinn/schema-editor/hooks/useSchemaEditorAppContext';
import { useTypeOptions } from './hooks/useTypeOptions';

export type IItemDataComponentProps = {
  schemaNode: UiSchemaNode;
};

export function ItemDataComponent({ schemaNode }: IItemDataComponentProps) {
  const {
    fieldType,
    pointer,
    title = '',
    description = '',
    reference,
    isCombinationItem,
    objectKind,
    isArray,
    custom,
  } = schemaNode;
  const dispatch = useDispatch();
  const { data, save, setSelectedTypePointer } = useSchemaEditorAppContext();
  const { t } = useTranslation();
  const typeOptions = useTypeOptions();

  const [itemTitle, setItemItemTitle] = useState<string>(title);
  const [itemDescription, setItemItemDescription] = useState<string>(description);
  const nodeName = getNameFromPointer({ pointer });

  const getChildNodes = () =>
    pointer && pointer.endsWith(nodeName) ? getChildNodesByPointer(data, pointer) : [];

  const onChangeRef = (path: string, ref: string) => save(setRef(data, { path, ref }));

  const onChangeFieldType = (type: FieldType) => save(setType(data, { path: pointer, type }));

  const onChangeNullable = (event: ChangeEvent<HTMLInputElement>): void => {
    const isChecked = event.target.checked;
    if (isChecked) {
      save(
        addCombinationItem(data, {
          pointer: pointer,
          props: { fieldType: FieldType.Null },
          callback: (newPointer: string) => dispatch(setSelectedNode(newPointer)),
        }),
      );
      return;
    }

    getChildNodes().forEach((childNode: UiSchemaNode) => {
      if (childNode.fieldType === FieldType.Null) {
        save(deleteNode(data, childNode.pointer));
        removeSelection(childNode.pointer);
      }
    });
  };

  const onChangeTitle = () => save(setTitle(data, { path: pointer, title: itemTitle }));

  const onChangeDescription = () =>
    save(setDescription(data, { path: pointer, description: itemDescription }));

  const onGoToDefButtonClick = () => {
    if (reference !== undefined) {
      dispatch(navigateToType({ pointer: reference }));
    }
  };

  const onChangeCombinationType = (value: CombinationKind) =>
    save(setCombinationType(data, { path: pointer, type: value }));

  const handleArrayPropertyToggle = () => save(toggleArrayField(data, pointer));

  const handleChangeNodeName = (newNodeName: string) => {
    save(
      setPropertyName(data, {
        path: pointer,
        name: newNodeName,
        callback: (newPointer: string) => {
          if (newPointer && pointerIsDefinition(newPointer)) {
            setSelectedTypePointer(newPointer);
          }
          dispatch(setSelectedNode(newPointer));
        },
      }),
    );
  };

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
          size='small'
        />
      )}
      {objectKind === ObjectKind.Field && (
        <Select
          label={t('schema_editor.type')}
          onChange={(type: FieldType) => onChangeFieldType(type)}
          options={typeOptions}
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
        <Switch
          className={classes.switch}
          size='small'
          checked={isArray}
          onChange={handleArrayPropertyToggle}
        >
          {t('schema_editor.multiple_answers')}
        </Switch>
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
        <Switch
          className={classes.switch}
          size='small'
          checked={combinationIsNullable(getChildNodes())}
          onChange={onChangeNullable}
        >
          {t('schema_editor.nullable')}
        </Switch>
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
          <Textfield
            id={titleId}
            label={t('schema_editor.title')}
            aria-label={t('schema_editor.title')}
            onBlur={onChangeTitle}
            onChange={(e: ChangeEvent) => setItemItemTitle((e.target as HTMLInputElement)?.value)}
            value={itemTitle}
          />
        </div>
        <div>
          <LegacyTextArea
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
