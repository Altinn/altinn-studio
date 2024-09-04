import type { BaseSyntheticEvent } from 'react';
import React, { useEffect, useState } from 'react';
import type { FieldType, FieldNode } from '@altinn/schema-model';
import { isField, isReference, ObjectKind } from '@altinn/schema-model';
import classes from './ItemFieldsTab.module.css';
import { StudioButton, usePrevious } from '@studio/components';
import { PlusIcon } from '@studio/icons';
import { useTranslation } from 'react-i18next';
import { ItemFieldsTable } from './ItemFieldsTable';
import { useAddProperty } from '@altinn/schema-editor/hooks/useAddProperty';
import { getLastNameField } from '@altinn/schema-editor/components/SchemaInspector/ItemFieldsTab/domUtils';
import { DropdownMenu } from '@digdir/designsystemet-react';
import { useTypeOptions } from '../hooks/useTypeOptions';

export interface ItemFieldsTabProps {
  selectedItem: FieldNode;
}

export const ItemFieldsTab = ({ selectedItem }: ItemFieldsTabProps) => {
  const addProperty = useAddProperty();

  const numberOfChildNodes = selectedItem.children.length;
  const prevNumberOfChildNodes = usePrevious<number>(numberOfChildNodes) ?? 0;
  const typeOptions = useTypeOptions();

  useEffect(() => {
    // If the number of fields has increased, a new field has been added and should get focus
    if (numberOfChildNodes > prevNumberOfChildNodes) {
      const newNodeInput = getLastNameField();
      newNodeInput?.focus();
      newNodeInput?.select();
    }
  }, [numberOfChildNodes, prevNumberOfChildNodes]);

  const { t } = useTranslation();
  const [isAddDropdownOpen, setIsAddDropdownOpen] = useState(false);

  const onAddPropertyClicked = (event: BaseSyntheticEvent, fieldType: FieldType) => {
    event.preventDefault();

    addProperty(ObjectKind.Field, fieldType, selectedItem.pointer);
  };
  const readonly = isReference(selectedItem);

  const closeDropdown = () => setIsAddDropdownOpen(false);
  return (
    <div className={classes.root}>
      {isField(selectedItem) && numberOfChildNodes > 0 && (
        <ItemFieldsTable readonly={readonly} selectedItem={selectedItem} />
      )}
      <DropdownMenu
        open={isAddDropdownOpen}
        onClose={closeDropdown}
        size='small'
        portal
        placement='bottom-start'
      >
        <DropdownMenu.Trigger asChild>
          {!readonly && (
            <StudioButton
              color='second'
              icon={<PlusIcon />}
              onClick={() => setIsAddDropdownOpen(true)}
              variant='secondary'
            >
              {t('schema_editor.add_property')}
            </StudioButton>
          )}
        </DropdownMenu.Trigger>
        <DropdownMenu.Content>
          <DropdownMenu.Group>
            {typeOptions.map(({ value: fieldType, label }) => (
              <DropdownMenu.Item
                key={fieldType}
                value={fieldType}
                onClick={(e) => onAddPropertyClicked(e, fieldType)}
              >
                {label}
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Group>
        </DropdownMenu.Content>
      </DropdownMenu>
    </div>
  );
};
