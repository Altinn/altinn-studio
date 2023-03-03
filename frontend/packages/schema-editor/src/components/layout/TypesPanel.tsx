import type { ChangeEvent } from 'react';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { ISchemaState } from '@altinn/schema-editor/types';
import {
  addCombinationItem,
  addProperty,
} from '@altinn/schema-editor/features/editor/schemaEditorSlice';

import { CombinationKind, UiSchemaNode } from '@altinn/schema-model';
import { FieldType, ObjectKind } from '@altinn/schema-model';

import { SchemaTreeView } from '../TreeView/SchemaTreeView';
import type { PanelProps } from '@altinn/schema-editor/components/layout/layoutTypes';
import { useTranslation } from 'react-i18next';
import classes from './TypesPanel.module.css';
import { ActionMenu } from '../common/ActionMenu';
import { IconImage } from '../common/Icon';
import { SchemaEditorTestIds } from '../SchemaEditor';

export type TypesPanelProps = PanelProps & {
  expandedDefNodes: string[];
  setExpandedDefNodes: (nodes: string[]) => void;
  definitions: UiSchemaNode;
};
export const TypesPanel = ({
  editMode,
  expandedDefNodes,
  setExpandedDefNodes,
  definitions,
}: TypesPanelProps) => {
  const translation = useTranslation();
  const t = (key: string) => translation.t('schema_editor.' + key);
  const dispatch = useDispatch();
  const selectedDefinitionNodeId = useSelector(
    (state: ISchemaState) => state.selectedDefinitionNodeId
  );
  const handleDefinitionsNodeExpanded = (_x: ChangeEvent<unknown>, nodeIds: string[]) =>
    setExpandedDefNodes(nodeIds);

  const handleAddProperty = (objectKind: ObjectKind, fieldType?: FieldType) => {
    const newNode: Partial<UiSchemaNode> = { objectKind };
    if (objectKind === ObjectKind.Field) {
      newNode.fieldType = fieldType ?? FieldType.Object;
    }
    if (objectKind === ObjectKind.Combination) {
      newNode.fieldType = CombinationKind.AllOf;
    }
    newNode.reference = objectKind === ObjectKind.Reference ? '' : undefined;
    const { pointer } = definitions;
    definitions.objectKind === ObjectKind.Combination
      ? dispatch(addCombinationItem({ pointer, props: newNode }))
      : dispatch(addProperty({ pointer, props: newNode }));
  };

  return (
    <div className={classes.root}>
      {editMode && (
        <ActionMenu
          items={[
            {
              action: () => handleAddProperty(ObjectKind.Field),
              icon: IconImage.Object,
              text: t('field'),
              testId: SchemaEditorTestIds.menuAddField,
            },
            {
              action: () => handleAddProperty(ObjectKind.Reference),
              icon: IconImage.Reference,
              text: t('reference'),
              testId: SchemaEditorTestIds.menuAddReference,
            },
            {
              action: () => handleAddProperty(ObjectKind.Combination),
              icon: IconImage.Combination,
              text: t('combination'),
              testId: SchemaEditorTestIds.menuAddCombination,
            },
            {
              action: () => handleAddProperty(ObjectKind.Field, FieldType.String),
              className: classes.dividerAbove,
              icon: IconImage.String,
              text: t('string'),
              testId: SchemaEditorTestIds.menuAddString,
            },
            {
              action: () => handleAddProperty(ObjectKind.Field, FieldType.Integer),
              icon: IconImage.Number,
              text: t('integer'),
              testId: SchemaEditorTestIds.menuAddInteger,
            },
            {
              action: () => handleAddProperty(ObjectKind.Field, FieldType.Number),
              icon: IconImage.Number,
              text: t('number'),
              testId: SchemaEditorTestIds.menuAddNumber,
            },
            {
              action: () => handleAddProperty(ObjectKind.Field, FieldType.Boolean),
              icon: IconImage.Boolean,
              text: t('boolean'),
              testId: SchemaEditorTestIds.menuAddBoolean,
            },
          ]}
          openButtonText={t('add')}
        />
      )}
      <SchemaTreeView
        editMode={editMode}
        expanded={expandedDefNodes}
        items={[definitions]}
        translate={t}
        onNodeToggle={handleDefinitionsNodeExpanded}
        selectedPointer={selectedDefinitionNodeId}
        isPropertiesView={false}
      />
    </div>
  );
};
