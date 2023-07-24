import type { ChangeEvent } from 'react';
import React from 'react';
import { useDispatch } from 'react-redux';
import {
  setSelectedAndFocusedNode,
  setSelectedNode,
} from '@altinn/schema-editor/features/editor/schemaEditorSlice';

import { CombinationKind, getNameFromPointer, UiSchemaNode, addProperty, addCombinationItem } from '@altinn/schema-model';
import { FieldType, ObjectKind } from '@altinn/schema-model';

import { SchemaTreeView } from '../TreeView/SchemaTreeView';
import type { PanelProps } from '@altinn/schema-editor/components/layout/layoutTypes';
import { useTranslation } from 'react-i18next';
import classes from './TypesPanel.module.css';
import { ActionMenu } from '../common/ActionMenu';
import { IconImage } from '../common/Icon';
import { SchemaEditorTestIds } from '../SchemaEditor';
import { useDatamodelQuery } from '@altinn/schema-editor/hooks/queries';
import { useDatamodelMutation } from '@altinn/schema-editor/hooks/mutations';

export type TypesPanelProps = PanelProps & {
  expandedDefNodes: string[];
  setExpandedDefNodes: (nodes: string[]) => void;
  uiSchemaNode: UiSchemaNode;
};
export const TypesPanel = ({
  editMode,
  expandedDefNodes,
  setExpandedDefNodes,
  uiSchemaNode,
}: TypesPanelProps) => {
  const translation = useTranslation();
  const t = (key: string) => translation.t('schema_editor.' + key);
  const dispatch = useDispatch();
  const { data } = useDatamodelQuery();
  const { mutate } = useDatamodelMutation();
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
    const { pointer } = uiSchemaNode;
    uiSchemaNode.objectKind === ObjectKind.Combination
      ? mutate(
        addCombinationItem(data, {
          pointer,
          props: newNode,
          callback: (newPointer) => dispatch(setSelectedNode(newPointer))
        })
      )
      : mutate(
        addProperty(data, {
          pointer,
          props: newNode,
          callback: (newPointer) => dispatch(setSelectedAndFocusedNode(newPointer))
        })
      );
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
        items={[uiSchemaNode]}
        translate={t}
        onNodeToggle={handleDefinitionsNodeExpanded}
        selectedPointer={uiSchemaNode.pointer}
        isPropertiesView={false}
        data-testid={`type-treeview-${getNameFromPointer({ pointer: uiSchemaNode.pointer })}`}
      />
    </div>
  );
};
