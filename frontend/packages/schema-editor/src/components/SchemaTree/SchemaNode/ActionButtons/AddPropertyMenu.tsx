import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAddProperty } from '../../../../hooks/useAddProperty';
import { ObjectKind } from '@altinn/schema-model';
import { ActionButton } from './ActionButton';
import { DropdownMenu } from '@digdir/design-system-react';
import { CombinationIcon, PropertyIcon, ReferenceIcon, PlusIcon } from '@studio/icons';
import { useSchemaEditorAppContext } from '@altinn/schema-editor/hooks/useSchemaEditorAppContext';

interface AddPropertyMenuProps {
  pointer: string;
}

export const AddPropertyMenu = ({ pointer }: AddPropertyMenuProps) => {
  const { setSelectedNodePointer } = useSchemaEditorAppContext();
  const { t } = useTranslation();
  const [isAddDropdownOpen, setIsAddDropdownOpen] = useState(false);
  const addProperty = useAddProperty();

  const addField = () => addPropertyAndClose(ObjectKind.Field);
  const addCombination = () => addPropertyAndClose(ObjectKind.Combination);
  const addReference = () => addPropertyAndClose(ObjectKind.Reference);

  const addPropertyAndClose = (kind: ObjectKind) => {
    const childPointer = addProperty(kind, undefined, pointer);
    setSelectedNodePointer(childPointer);
    closeDropdown();
  };

  const closeDropdown = () => setIsAddDropdownOpen(false);

  return (
    <>
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
          <DropdownMenu.Group>
            <DropdownMenu.Item onClick={addField}>
              <PropertyIcon />
              {t('schema_editor.add_field')}
            </DropdownMenu.Item>
            <DropdownMenu.Item onClick={addCombination}>
              <CombinationIcon />
              {t('schema_editor.add_combination')}
            </DropdownMenu.Item>
            <DropdownMenu.Item onClick={addReference}>
              <ReferenceIcon />
              {t('schema_editor.add_reference')}
            </DropdownMenu.Item>
          </DropdownMenu.Group>
        </DropdownMenu.Content>
      </DropdownMenu>
    </>
  );
};
