import React from 'react';
import { ActionMenu } from '../common/ActionMenu';
import classes from './ModelsPanel.module.css';
import { IconImage } from '../common/Icon';
import { FieldType, ObjectKind } from '@altinn/schema-model';
import { useTranslation } from 'react-i18next';
import { useAddProperty } from '@altinn/schema-editor/hooks/useAddProperty';
import { SchemaTree } from '../SchemaTree';
import { useSchemaEditorAppContext } from '@altinn/schema-editor/hooks/useSchemaEditorAppContext';

export const ModelsPanel = () => {
  const translation = useTranslation();
  const t = (key: string) => translation.t('schema_editor.' + key);
  const { setSelectedNodePointer } = useSchemaEditorAppContext();
  const addProperty = useAddProperty();

  const handleAddProperty = (objectKind: ObjectKind, fieldType?: FieldType) => {
    const newPointer = addProperty(objectKind, fieldType);
    if (newPointer) {
      setSelectedNodePointer(newPointer);
    }
  };

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
      <div>
        <SchemaTree />
      </div>
    </>
  );
};
