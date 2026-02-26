import React from 'react';
import { useAddProperty } from '../../../../hooks/useAddProperty';
import type { FieldType, ObjectKind } from '@altinn/schema-model';
import { SchemaModel } from '@altinn/schema-model';
import { useSchemaEditorAppContext } from '@altinn/schema-editor/hooks/useSchemaEditorAppContext';
import { AddPropertiesMenu } from '../../../AddPropertiesMenu';

interface AddPropertyMenuProps {
  schemaPointer: string;
  uniquePointer: string;
}

export const AddPropertyMenu = ({ schemaPointer, uniquePointer }: AddPropertyMenuProps) => {
  const { setSelectedUniquePointer } = useSchemaEditorAppContext();

  const addProperty = useAddProperty();

  const addPropertyAndClose = (kind: ObjectKind, fieldType?: FieldType) => {
    const childPointer = addProperty(kind, fieldType, schemaPointer);
    if (childPointer) {
      const uniqueChildPointer = SchemaModel.getUniquePointer(childPointer, uniquePointer);
      setSelectedUniquePointer(uniqueChildPointer);
    }
  };

  return <AddPropertiesMenu onItemClick={addPropertyAndClose} />;
};
