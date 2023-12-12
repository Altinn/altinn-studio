import { SavableSchemaModel } from '@altinn/schema-editor/classes/SavableSchemaModel';
import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAddProperty } from '@altinn/schema-editor/hooks/useAddProperty';
import { isCombination, ObjectKind } from '../../../../../../schema-model';
import { ActionButton } from './ActionButton';
import { PlusIcon } from '@navikt/aksel-icons';
import { DropdownMenu } from '@digdir/design-system-react';
import { Combination, Property, Reference } from '@studio/icons';

interface AddPropertyMenuProps {
  pointer: string;
  savableModel: SavableSchemaModel;
}

export const AddPropertyMenu = ({ pointer, savableModel }: AddPropertyMenuProps) => {
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const { t } = useTranslation();
  const [isAddDropdownOpen, setIsAddDropdownOpen] = useState(false);
  const addProperty = useAddProperty();

  const node = savableModel.getNode(pointer);

  const addField = () => addPropertyAndClose(ObjectKind.Field);
  const addCombination = () => addPropertyAndClose(ObjectKind.Combination);
  const addReference = () => addPropertyAndClose(ObjectKind.Reference);

  const addPropertyAndClose = (kind: ObjectKind) => {
    addProperty(kind, undefined, pointer);
    closeDropdown();
  };

  const closeDropdown = () => setIsAddDropdownOpen(false);

  return (
    <>
      <ActionButton
        aria-expanded={isAddDropdownOpen}
        aria-haspopup='menu'
        icon={<PlusIcon />}
        onClick={() => setIsAddDropdownOpen(true)}
        ref={addButtonRef}
        titleKey='schema_editor.add_node_of_type'
      />
      <DropdownMenu
        anchorEl={addButtonRef.current}
        open={isAddDropdownOpen}
        onClose={closeDropdown}
        size='small'
      >
        <DropdownMenu.Group>
          {!isCombination(node) && (
            <>
              <DropdownMenu.Item onClick={addField} icon={<Property />}>
                {t('schema_editor.add_field')}
              </DropdownMenu.Item>
              <DropdownMenu.Item onClick={addCombination} icon={<Combination />}>
                {t('schema_editor.add_combination')}
              </DropdownMenu.Item>
            </>
          )}
          <DropdownMenu.Item onClick={addReference} icon={<Reference />}>
            {t('schema_editor.add_reference')}
          </DropdownMenu.Item>
        </DropdownMenu.Group>
      </DropdownMenu>
    </>
  );
};
