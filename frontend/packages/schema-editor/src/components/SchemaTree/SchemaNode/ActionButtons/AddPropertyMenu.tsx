import React from 'react';
import { useAddProperty } from '../../../../hooks/useAddProperty';
import type { FieldType, ObjectKind } from '@altinn/schema-model';
import { useSavableSchemaModel } from '../../../../hooks/useSavableSchemaModel';
import { useSchemaEditorAppContext } from '@altinn/schema-editor/hooks/useSchemaEditorAppContext';
import { AddPropertiesMenu } from '@altinn/schema-editor/components/AddPropertiesMenu';
import { useTranslation } from 'react-i18next';

interface AddPropertyMenuProps {
  schemaPointer: string;
  uniquePointer: string;
}

export const AddPropertyMenu = ({ schemaPointer, uniquePointer }: AddPropertyMenuProps) => {
  const { setSelectedUniquePointer } = useSchemaEditorAppContext();
  const savableModel = useSavableSchemaModel();
  const { t } = useTranslation();

  const addProperty = useAddProperty();

  const addPropertyAndClose = (kind: ObjectKind, fieldType?: FieldType) => {
    const childPointer = addProperty(kind, fieldType, schemaPointer);
    setSelectedUniquePointer(savableModel.getUniquePointer(childPointer, uniquePointer));
  };

  return (
    <AddPropertiesMenu
      onItemClick={addPropertyAndClose}
      ancherButtonProps={{
        children: '',
        title: t('schema_editor.add_node_of_type'),
        variant: 'tertiary',
      }}
    />
  );
};
