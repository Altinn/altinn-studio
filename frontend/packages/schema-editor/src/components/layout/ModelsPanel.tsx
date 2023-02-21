import type { ChangeEvent } from 'react';
import React from 'react';
import { ActionMenu } from '../common/ActionMenu';
import classes from './ModelsPanel.module.css';
import { IconImage } from '../common/Icon';
import { SchemaTreeView } from '../TreeView/SchemaTreeView';
import { SchemaEditorTestIds } from '../SchemaEditor';
import { addRootItem } from '../../features/editor/schemaEditorSlice';
import type { UiSchemaNode, UiSchemaNodes } from '@altinn/schema-model';
import {
  CombinationKind,
  FieldType,
  Keywords,
  makePointer,
  ObjectKind,
} from '@altinn/schema-model';
import { useDispatch, useSelector } from 'react-redux';
import type { ISchemaState } from '../../types';
import type { PanelProps } from './layoutTypes';
import { useTranslation } from 'react-i18next';

export type ModelsPanelProps = PanelProps & {
  expandedPropNodes: string[];
  setExpandedPropNodes: (nodes: string[]) => void;
  properties: UiSchemaNodes;
};
export const ModelsPanel = ({
  editMode,
  expandedPropNodes,
  setExpandedPropNodes,
  properties,
}: ModelsPanelProps) => {
  const translation = useTranslation();
  const t = (key: string) => translation.t('schema_editor.' + key);
  const dispatch = useDispatch();
  const selectedPropertyNodeId = useSelector((state: ISchemaState) => state.selectedPropertyNodeId);
  const handleAddProperty = (objectKind: ObjectKind, fieldType?: FieldType) => {
    const newNode: Partial<UiSchemaNode> = { objectKind };
    if (objectKind === ObjectKind.Field) {
      newNode.fieldType = fieldType ?? FieldType.Object;
    }
    if (objectKind === ObjectKind.Combination) {
      newNode.fieldType = CombinationKind.AllOf;
    }
    newNode.reference = objectKind === ObjectKind.Reference ? '' : undefined;
    dispatch(
      addRootItem({
        name: 'name',
        location: makePointer(Keywords.Properties),
        props: newNode,
      })
    );
  };

  const handlePropertiesNodeExpanded = (_x: ChangeEvent<unknown>, nodeIds: string[]) =>
    setExpandedPropNodes(nodeIds);
  return (
    <>
      {editMode && (
        <ActionMenu
          className={classes.addMenu}
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
        expanded={expandedPropNodes}
        items={properties}
        translate={t}
        onNodeToggle={handlePropertiesNodeExpanded}
        selectedPointer={selectedPropertyNodeId}
        isPropertiesView={true}
      />
    </>
  );
};
