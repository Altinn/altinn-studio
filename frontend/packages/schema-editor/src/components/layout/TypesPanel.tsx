import React from 'react';
import { useDispatch } from 'react-redux';
import {
  setSelectedAndFocusedNode,
  setSelectedNode,
} from '@altinn/schema-editor/features/editor/schemaEditorSlice';

import { UiSchemaNode } from '@altinn/schema-model';
import { FieldType, ObjectKind } from '@altinn/schema-model';

import { useTranslation } from 'react-i18next';
import { ActionMenu } from '../common/ActionMenu';
import { IconImage } from '../common/Icon';
import { isCombination } from '@altinn/schema-model';
import { useAddProperty } from '@altinn/schema-editor/hooks/useAddProperty';
import { SchemaTree } from '@altinn/schema-editor/components/SchemaTree';
import { useSavableSchemaModel } from '@altinn/schema-editor/hooks/useSavableSchemaModel';

export type TypesPanelProps = {
  uiSchemaNode: UiSchemaNode;
};
export const TypesPanel = ({ uiSchemaNode }: TypesPanelProps) => {
  const savableSchemaModel = useSavableSchemaModel();
  const translation = useTranslation();
  const t = (key: string) => translation.t('schema_editor.' + key);
  const dispatch = useDispatch();
  const addProperty = useAddProperty();

  const handleAddProperty = (objectKind: ObjectKind, fieldType?: FieldType) => {
    const newPointer = addProperty(objectKind, fieldType, uiSchemaNode.pointer);
    if (newPointer) {
      dispatch(
        isCombination(uiSchemaNode)
          ? setSelectedNode(newPointer)
          : setSelectedAndFocusedNode(newPointer),
      );
    }
  };

  return (
    <>
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
      <SchemaTree savableSchemaModel={savableSchemaModel} pointer={uiSchemaNode.pointer} />
    </>
  );
};
