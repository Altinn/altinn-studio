import React, { useState } from 'react';
import { useAddProperty } from '../../../../hooks/useAddProperty';
import type { FieldType, ObjectKind } from '@altinn/schema-model';
import { ActionButton } from './ActionButton';
import { DropdownMenu } from '@digdir/designsystemet-react';
import { useSavableSchemaModel } from '../../../../hooks/useSavableSchemaModel';
import { PlusIcon } from '@studio/icons';
import { useSchemaEditorAppContext } from '@altinn/schema-editor/hooks/useSchemaEditorAppContext';
import { AddPropertiesMenu } from '@altinn/schema-editor/components/AddPropertiesMenu';

interface AddPropertyMenuProps {
  schemaPointer: string;
  uniquePointer: string;
}

export const AddPropertyMenu = ({ schemaPointer, uniquePointer }: AddPropertyMenuProps) => {
  const { setSelectedUniquePointer } = useSchemaEditorAppContext();
  const savableModel = useSavableSchemaModel();

  const [isAddDropdownOpen, setIsAddDropdownOpen] = useState(false);
  const addProperty = useAddProperty();

  const addPropertyAndClose = (kind: ObjectKind, fieldType?: FieldType) => {
    const childPointer = addProperty(kind, fieldType, schemaPointer);
    setSelectedUniquePointer(savableModel.getUniquePointer(childPointer, uniquePointer));
    closeDropdown();
  };

  const closeDropdown = () => setIsAddDropdownOpen(false);

  return (
    <DropdownMenu open={isAddDropdownOpen} onClose={closeDropdown} size='small' portal>
      <DropdownMenu.Trigger asChild>
        <ActionButton
          aria-expanded={isAddDropdownOpen}
          aria-haspopup='menu'
          icon={<PlusIcon />}
          onClick={() => setIsAddDropdownOpen(true)}
          titleKey='schema_editor.add_node_of_type'
        />
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        <AddPropertiesMenu onItemClick={addPropertyAndClose} />
      </DropdownMenu.Content>
    </DropdownMenu>
  );
};
