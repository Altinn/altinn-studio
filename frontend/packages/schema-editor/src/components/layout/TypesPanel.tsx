import type { ChangeEvent } from 'react';
import React from 'react';
import { useDispatch } from 'react-redux';
import {
  setSelectedAndFocusedNode,
  setSelectedNode,
} from '@altinn/schema-editor/features/editor/schemaEditorSlice';

import { CombinationKind, UiSchemaNode, addProperty, addCombinationItem } from '@altinn/schema-model';
import { FieldType, ObjectKind } from '@altinn/schema-model';

import { SchemaTreeView } from '../TreeView/SchemaTreeView';
import { useTranslation } from 'react-i18next';
import classes from './TypesPanel.module.css';
import { ActionMenu } from '../common/ActionMenu';
import { IconImage } from '../common/Icon';
import { useSchemaEditorAppContext } from '@altinn/schema-editor/hooks/useSchemaEditorAppContext';

export type TypesPanelProps = {
  expandedDefNodes: string[];
  setExpandedDefNodes: (nodes: string[]) => void;
  uiSchemaNode: UiSchemaNode;
};
export const TypesPanel = ({
  expandedDefNodes,
  setExpandedDefNodes,
  uiSchemaNode,
}: TypesPanelProps) => {
  const translation = useTranslation();
  const t = (key: string) => translation.t('schema_editor.' + key);
  const dispatch = useDispatch();
  const { data, save } = useSchemaEditorAppContext();
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
      ? save(
        addCombinationItem(data, {
          pointer,
          props: newNode,
          callback: (newPointer) => dispatch(setSelectedNode(newPointer))
        })
      )
      : save(
        addProperty(data, {
          pointer,
          props: newNode,
          callback: (newPointer) => dispatch(setSelectedAndFocusedNode(newPointer))
        })
      );
  };

  return (
    <div className={classes.root}>
        <ActionMenu
          items={[
            {
              action: () => handleAddProperty(ObjectKind.Field),
              icon: IconImage.Object,
              text: t('field'),
            },
            {
              action: () => handleAddProperty(ObjectKind.Reference),
              icon: IconImage.Reference,
              text: t('reference'),
            },
            {
              action: () => handleAddProperty(ObjectKind.Combination),
              icon: IconImage.Combination,
              text: t('combination'),
            },
            {
              action: () => handleAddProperty(ObjectKind.Field, FieldType.String),
              className: classes.dividerAbove,
              icon: IconImage.String,
              text: t('string'),
            },
            {
              action: () => handleAddProperty(ObjectKind.Field, FieldType.Integer),
              icon: IconImage.Number,
              text: t('integer'),
            },
            {
              action: () => handleAddProperty(ObjectKind.Field, FieldType.Number),
              icon: IconImage.Number,
              text: t('number'),
            },
            {
              action: () => handleAddProperty(ObjectKind.Field, FieldType.Boolean),
              icon: IconImage.Boolean,
              text: t('boolean'),
            },
          ]}
          openButtonText={t('add')}
        />
      <SchemaTreeView
        expanded={expandedDefNodes}
        items={[uiSchemaNode]}
        translate={t}
        onNodeToggle={handleDefinitionsNodeExpanded}
        selectedPointer={uiSchemaNode.pointer}
        isPropertiesView={false}
      />
    </div>
  );
};
