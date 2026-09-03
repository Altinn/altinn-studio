import type { ChangeEvent } from 'react';
import { useState } from 'react';
import { ReferenceSelectionComponent } from './ReferenceSelectionComponent';
import { getCombinationOptions } from './helpers/options';
import classes from './ItemDataComponent.module.css';
import { ItemRestrictions } from './ItemRestrictions';
import type { CombinationKind, FieldNode, UiSchemaNode } from '@altinn/schema-model';
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
  schemaPointerToDataBindingName,
} from '@altinn/schema-model';
import { makeDomFriendlyID } from '../../utils/ui-schema-utils';
import { useTranslation } from 'react-i18next';
import { CustomProperties } from '@altinn/schema-editor/components/SchemaInspector/CustomProperties';
import { PrefillSection } from '@altinn/schema-editor/components/SchemaInspector/PrefillSection/PrefillSection';
import { renamePrefillMappings } from '@altinn/schema-editor/components/SchemaInspector/PrefillSection/prefillConfigUtils';
import { NameField } from './NameField';
import { RequiredSwitch } from './RequiredSwitch';
import { useSchemaEditorAppContext } from '@altinn/schema-editor/hooks/useSchemaEditorAppContext';
import {
  StudioDivider,
  StudioFieldset,
  StudioSelect,
  StudioSwitch,
  StudioTextarea,
  StudioTextfield,
} from '@studio/components';

export type IItemDataComponentProps = {
  schemaNode: UiSchemaNode;
};

export function ItemDataComponent({ schemaNode }: IItemDataComponentProps) {
  const { schemaPointer, title = '', description = '', isArray, isRequired, custom } = schemaNode;
  const {
    schemaModel,
    save,
    setSelectedTypePointer,
    selectedUniquePointer,
    setSelectedUniquePointer,
    prefillConfig,
    savePrefillConfig,
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
    const oldDataBindingName = schemaPointerToDataBindingName(schemaPointer);
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

          const newDataBindingName = schemaPointerToDataBindingName(newPointer);
          const updatedPrefillConfig = renamePrefillMappings(
            prefillConfig,
            oldDataBindingName,
            newDataBindingName,
          );
          if (updatedPrefillConfig !== prefillConfig) {
            savePrefillConfig(updatedPrefillConfig);
          }
        },
      }),
    );
  };

  const hasCustomProps = custom !== undefined && Object.keys(custom).length > 0;

  const isPrefillableField =
    isField(schemaNode) &&
    !schemaNode.isArray &&
    !pointerIsDefinition(schemaPointer) &&
    schemaNode.fieldType !== FieldType.Object &&
    schemaNode.fieldType !== FieldType.Null;

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
            <StudioSwitch
              data-size='sm'
              className={classes.switch}
              checked={isArray}
              onChange={handleArrayPropertyToggle}
              label={t('schema_editor.multiple_answers')}
            />
          )}
          {isCombination(schemaNode) && (
            <StudioSelect
              label={t('schema_editor.type')}
              onChange={(event) => onChangeCombinationType(event.target.value as CombinationKind)}
              value={schemaNode.combinationType}
            >
              {getCombinationOptions(t).map((option) => (
                <StudioSelect.Option key={option.value} value={option.value}>
                  {t(option.label)}
                </StudioSelect.Option>
              ))}
            </StudioSelect>
          )}
          {isCombination(schemaNode) && (
            <StudioSwitch
              data-size='sm'
              className={classes.switch}
              checked={combinationIsNullable(getChildNodes())}
              onChange={onChangeNullable}
              label={t('schema_editor.nullable')}
            />
          )}
          {!pointerIsDefinition(schemaPointer) && (
            <RequiredSwitch
              className={classes.switch}
              schemaPointer={schemaPointer}
              isRequired={isRequired}
            />
          )}
          {isPrefillableField && (
            <PrefillSection
              schemaPointer={schemaPointer}
              prefill={(schemaNode as FieldNode).prefill}
            />
          )}
          <ItemRestrictions schemaNode={schemaNode} />
        </>
      )}
      {hasCustomProps && <CustomProperties path={schemaPointer} />}
      <StudioDivider />
      <StudioFieldset legend={t('schema_editor.descriptive_fields')}>
        <StudioTextfield
          id={titleId}
          label={t('schema_editor.title')}
          onBlur={onChangeTitle}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setItemItemTitle(e.target.value)}
          value={itemTitle}
        />
        <StudioDivider />
        <StudioTextarea
          id={descriptionId}
          label={t('schema_editor.description')}
          onBlur={onChangeDescription}
          onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
            setItemItemDescription(event.target.value)
          }
          value={itemDescription}
        />
        {/* </div> */}
      </StudioFieldset>
    </div>
  );
}
