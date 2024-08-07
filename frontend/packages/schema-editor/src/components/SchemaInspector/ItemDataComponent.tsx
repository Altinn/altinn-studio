import type { ChangeEvent } from 'react';
import React, { useState } from 'react';
import { ReferenceSelectionComponent } from './ReferenceSelectionComponent';
import { getCombinationOptions } from './helpers/options';
import { Fieldset, Textfield, Switch } from '@digdir/designsystemet-react';
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
} from '@altinn/schema-model';
import { makeDomFriendlyID } from '../../utils/ui-schema-utils';
import { Divider } from 'app-shared/primitives';
import { useTranslation } from 'react-i18next';
import { CustomProperties } from '@altinn/schema-editor/components/SchemaInspector/CustomProperties';
import { NameField } from './NameField';
import { useSchemaEditorAppContext } from '@altinn/schema-editor/hooks/useSchemaEditorAppContext';
import { StudioNativeSelect, StudioTextarea } from '@studio/components';

export type IItemDataComponentProps = {
  schemaNode: UiSchemaNode;
};

export function ItemDataComponent({ schemaNode }: IItemDataComponentProps) {
  const { pointer, title = '', description = '', isArray, custom } = schemaNode;
  const { schemaModel, save, setSelectedTypePointer, setSelectedNodePointer } =
    useSchemaEditorAppContext();
  const { t } = useTranslation();

  const [itemTitle, setItemItemTitle] = useState<string>(title);
  const [itemDescription, setItemItemDescription] = useState<string>(description);
  const nodeName = extractNameFromPointer(pointer);

  const getChildNodes = () =>
    pointer && pointer.endsWith(nodeName) ? schemaModel.getChildNodes(pointer) : [];

  const onChangeRef = (path: string, ref: string) => save(setRef(schemaModel, { path, ref }));

  const onChangeNullable = (event: ChangeEvent<HTMLInputElement>): void => {
    const isChecked = event.target.checked;
    if (isChecked) {
      save(
        addCombinationItem(schemaModel, {
          pointer,
          callback: setSelectedNodePointer,
        }),
      );
      return;
    }

    getChildNodes().forEach((childNode: UiSchemaNode) => {
      if (isField(childNode) && childNode.fieldType === FieldType.Null) {
        save(deleteNode(schemaModel, childNode.pointer));
        setSelectedNodePointer(null);
      }
    });
  };

  const onChangeTitle = () => save(setTitle(schemaModel, { path: pointer, title: itemTitle }));

  const onChangeDescription = () =>
    save(setDescription(schemaModel, { path: pointer, description: itemDescription }));

  const onGoToDefButtonClick = () => {
    if (isReference(schemaNode)) {
      setSelectedTypePointer(schemaNode.reference);
    }
  };

  const onChangeCombinationType = (value: CombinationKind) =>
    save(setCombinationType(schemaModel, { path: pointer, type: value }));

  const handleArrayPropertyToggle = () => save(toggleArrayField(schemaModel, pointer));

  const handleChangeNodeName = (newNodeName: string) => {
    save(
      setPropertyName(schemaModel, {
        path: pointer,
        name: newNodeName,
        callback: (newPointer: string) => {
          if (newPointer && pointerIsDefinition(newPointer)) {
            setSelectedTypePointer(newPointer);
          }
          setSelectedNodePointer(newPointer);
        },
      }),
    );
  };

  const hasCustomProps = custom !== undefined && Object.keys(custom).length > 0;

  const titleId = makeDomFriendlyID(pointer, { suffix: 'title' });
  const descriptionId = makeDomFriendlyID(pointer, { suffix: 'description' });

  return (
    <div className={classes.root}>
      {pointer !== ROOT_POINTER && (
        <>
          {!schemaModel.isChildOfCombination(pointer) && (
            <NameField
              id='selectedItemName'
              label={t('schema_editor.name')}
              handleSave={handleChangeNodeName}
              pointer={pointer}
              size='small'
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
          {!isCombination(schemaNode) && !pointerIsDefinition(pointer) && (
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
          <Divider marginless />
        </>
      )}
      {hasCustomProps && (
        <>
          <CustomProperties path={pointer} />
          <Divider marginless />
        </>
      )}
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
          <StudioTextarea
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
