import type { ChangeEvent } from 'react';
import React from 'react';
import { ActionMenu } from '../common/ActionMenu';
import classes from './ModelsPanel.module.css';
import { IconImage } from '../common/Icon';
import { SchemaTreeView } from '../TreeView/SchemaTreeView';
import { setSelectedAndFocusedNode } from '../../features/editor/schemaEditorSlice';
import type { UiSchemaNodes } from '@altinn/schema-model';
import { FieldType, ObjectKind } from '@altinn/schema-model';
import { useDispatch, useSelector } from 'react-redux';
import type { SchemaState } from '../../types';
import { useTranslation } from 'react-i18next';
import { useAddProperty } from '@altinn/schema-editor/hooks/useAddProperty';

export type ModelsPanelProps = {
  expandedPropNodes: string[];
  setExpandedPropNodes: (nodes: string[]) => void;
  properties: UiSchemaNodes;
};
export const ModelsPanel = ({
  expandedPropNodes,
  setExpandedPropNodes,
  properties,
}: ModelsPanelProps) => {
  const translation = useTranslation();
  const t = (key: string) => translation.t('schema_editor.' + key);
  const dispatch = useDispatch();
  const selectedPropertyNodeId = useSelector((state: SchemaState) => state.selectedPropertyNodeId);
  const addProperty = useAddProperty();

  const handleAddProperty = (objectKind: ObjectKind, fieldType?: FieldType) => {
    const newPointer = addProperty(objectKind, fieldType);
    if (newPointer) {
      dispatch(setSelectedAndFocusedNode(newPointer));
    }
  };

  const handlePropertiesNodeExpanded = (_x: ChangeEvent<unknown>, nodeIds: string[]) =>
    setExpandedPropNodes(nodeIds);
  return (
    <>
      <ActionMenu
        items={[
          {
            action: () => handleAddProperty(ObjectKind.Field, FieldType.Object),
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
        expanded={expandedPropNodes}
        items={properties}
        onNodeToggle={handlePropertiesNodeExpanded}
        selectedPointer={selectedPropertyNodeId}
        isPropertiesView={true}
      />
    </>
  );
};
