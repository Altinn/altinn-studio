import React from 'react';
import { useAddProperty } from '../../../../hooks/useAddProperty';
import type { FieldType, ObjectKind } from '@altinn/schema-model/index';
import { SchemaModel } from '@altinn/schema-model/index';
import { useSchemaEditorAppContext } from '@altinn/schema-editor/hooks/useSchemaEditorAppContext';
import { AddPropertiesMenu } from '../../../AddPropertiesMenu';
import { useTranslation } from 'react-i18next';
import classes from './ActionButton.module.css';

interface AddPropertyMenuProps {
  schemaPointer: string;
  uniquePointer: string;
}

export const AddPropertyMenu = ({ schemaPointer, uniquePointer }: AddPropertyMenuProps) => {
  const { setSelectedUniquePointer } = useSchemaEditorAppContext();
  const { t } = useTranslation();

  const addProperty = useAddProperty();

  const addPropertyAndClose = (kind: ObjectKind, fieldType?: FieldType) => {
    const childPointer = addProperty(kind, fieldType, schemaPointer);
    if (childPointer) {
      const uniqueChildPointer = SchemaModel.getUniquePointer(childPointer, uniquePointer);
      setSelectedUniquePointer(uniqueChildPointer);
    }
  };

  return (
    <AddPropertiesMenu
      onItemClick={addPropertyAndClose}
      anchorButtonProps={{
        children: '',
        title: t('schema_editor.add_node_of_type_in_child_node_title'),
        variant: 'tertiary',
        className: classes.actionButton,
      }}
    />
  );
};
