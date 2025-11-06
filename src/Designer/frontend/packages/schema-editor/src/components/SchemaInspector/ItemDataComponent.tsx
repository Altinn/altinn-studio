import type { ChangeEvent } from 'react';
import React, { useState } from 'react';
import { ReferenceSelectionComponent } from './ReferenceSelectionComponent';
import { getCombinationOptions } from './helpers/options';
import { Fieldset, Switch } from '@digdir/designsystemet-react';
import classes from './ItemDataComponent.module.css';
import { ItemRestrictions } from './ItemRestrictions';
import type { CombinationKind, UiSchemaNode } from '@altinn/schema-model';
import {
  addCombinationItem,
  deleteNode,
  pointerIsDefinition,
  setCombinationType,
  setDescription,
  setPropertyName,
  setRef,
  setTitle,
  toggleArrayField,
  isField,
  isReference,
  isCombination,
  extractNameFromPointer,
  FieldType,
  combinationIsNullable,
  ROOT_POINTER,
  changeNameInPointer,
} from '@altinn/schema-model';
import { makeDomFriendlyID } from '../../utils/ui-schema-utils';
import { useTranslation } from 'react-i18next';
import { CustomProperties } from '@altinn/schema-editor/components/SchemaInspector/CustomProperties';
import { NameField } from './NameField';
import { useSchemaEditorAppContext } from '@altinn/schema-editor/hooks/useSchemaEditorAppContext';
import { StudioNativeSelect, StudioTextfield } from '@studio/components-legacy';
import { StudioTextarea } from '@studio/components';

export type IItemDataComponentProps = {
  schemaNode: UiSchemaNode;
};

export function ItemDataComponent({ schemaNode }: IItemDataComponentProps) {
  const { schemaPointer, title = '', description = '', isArray, custom } = schemaNode;
  const {
    schemaModel,
    save,
    setSelectedTypePointer,
    selectedUniquePointer,
    setSelectedUniquePointer,
  } = useSchemaEditorAppContext();
  const { t } = useTranslation();

  const [itemTitle, setItemItemTitle] = useState<string>(title);
  const [itemDescription, setItemItemDescription] = useState<string>(description);
  const nodeName = extractNameFromPointer(schemaPointer);

  const getChildNodes = () =>
    schemaPointer && schemaPointer.endsWith(nodeName)
      ? schemaModel.getChildNodes(schemaPointer)
      : [];

  const onChangeRef = (path: string, ref: string) => save(setRef(schemaModel, { path, ref }));

  const onChangeNullable = (event: ChangeEvent<HTMLInputElement>): void => {
    const isChecked = event.target.checked;
    if (isChecked) {
      save(
        addCombinationItem(schemaModel, {
          schemaPointer,
          callback: setSelectedUniquePointer,
        }),
      );
      return;
    }

    getChildNodes().forEach((childNode: UiSchemaNode) => {
      if (isField(childNode) && childNode.fieldType === FieldType.Null) {
        save(deleteNode(schemaModel, childNode.schemaPointer));
        setSelectedUniquePointer(null);
      }
    });
  };

  const onChangeTitle = () =>
    save(setTitle(schemaModel, { path: schemaPointer, title: itemTitle }));

  const onChangeDescription = () =>
    save(setDescription(schemaModel, { path: schemaPointer, description: itemDescription }));

  const onGoToDefButtonClick = () => {
    if (isReference(schemaNode)) {
      setSelectedTypePointer(schemaNode.reference);
    }
  };

  const onChangeCombinationType = (value: CombinationKind) =>
    save(setCombinationType(schemaModel, { path: schemaPointer, type: value }));

  const handleArrayPropertyToggle = () => save(toggleArrayField(schemaModel, schemaPointer));

  const handleChangeNodeName = (newNodeName: string) => {
    save(
      setPropertyName(schemaModel, {
        path: schemaPointer,
        name: newNodeName,
        callback: (newPointer: string) => {
          if (newPointer && pointerIsDefinition(newPointer)) {
            setSelectedTypePointer(newPointer);
          }
          const newUniquePointer = changeNameInPointer(selectedUniquePointer, newNodeName);
          setSelectedUniquePointer(newUniquePointer);
        },
      }),
    );
  };

  const hasCustomProps = custom !== undefined && Object.keys(custom).length > 0;

  const titleId = makeDomFriendlyID(schemaPointer, { suffix: 'title' });
  const descriptionId = makeDomFriendlyID(schemaPointer, { suffix: 'description' });

  return (
    <div className={classes.root}>
      {schemaPointer !== ROOT_POINTER && (
        <>
          {!schemaModel.isChildOfCombination(schemaPointer) && (
            <NameField
              id='selectedItemName'
              label={t('schema_editor.name')}
              handleSave={handleChangeNodeName}
              schemaPointer={schemaPointer}
            />
          )}
          {isReference(schemaNode) && (
            <ReferenceSelectionComponent
              buttonText={t('schema_editor.go_to_type')}
              label={t('schema_editor.reference_to')}
              onChangeRef={onChangeRef}
              onGoToDefButtonClick={onGoToDefButtonClick}
              selectedNode={schemaNode}
            />
          )}
          {!isCombination(schemaNode) && !pointerIsDefinition(schemaPointer) && (
            <Switch
              className={classes.switch}
              size='small'
              checked={isArray}
              onChange={handleArrayPropertyToggle}
            >
              {t('schema_editor.multiple_answers')}
            </Switch>
          )}
          {isCombination(schemaNode) && (
            <StudioNativeSelect
              label={t('schema_editor.type')}
              onChange={(event) => onChangeCombinationType(event.target.value as CombinationKind)}
              value={schemaNode.combinationType}
              size='sm'
            >
              {getCombinationOptions(t).map((option) => (
                <option key={option.value} value={option.value}>
                  {t(option.label)}
                </option>
              ))}
            </StudioNativeSelect>
          )}
          {isCombination(schemaNode) && (
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
        </>
      )}
      {hasCustomProps && <CustomProperties path={schemaPointer} />}
      <Fieldset legend={t('schema_editor.descriptive_fields')} className={classes.fieldSet}>
        <div>
          <StudioTextfield
            id={titleId}
            label={t('schema_editor.title')}
            aria-label={t('schema_editor.title')}
            onBlur={onChangeTitle}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setItemItemTitle(e.target.value)}
            value={itemTitle}
          />
        </div>
        <div>
          <StudioTextarea
            id={descriptionId}
            aria-label={t('schema_editor.description')}
            label={t('schema_editor.description')}
            onBlur={onChangeDescription}
            onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
              setItemItemDescription(event.target.value)
            }
            value={itemDescription}
          />
        </div>
      </Fieldset>
    </div>
  );
}
