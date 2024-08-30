import type { BaseSyntheticEvent } from 'react';
import React, { useEffect, useState } from 'react';
import type { FieldType, FieldNode, ObjectKind } from '@altinn/schema-model';
import { isField, isReference } from '@altinn/schema-model';
import classes from './ItemFieldsTab.module.css';
import { StudioButton, usePrevious } from '@studio/components';
import { PlusIcon } from '@studio/icons';
import { useTranslation } from 'react-i18next';
import { ItemFieldsTable } from './ItemFieldsTable';
import { useAddProperty } from '@altinn/schema-editor/hooks/useAddProperty';
import { getLastNameField } from '@altinn/schema-editor/components/SchemaInspector/ItemFieldsTab/domUtils';
import { DropdownMenu } from '@digdir/designsystemet-react';
import { propertyItems } from '../../SchemaTree/SchemaNode/ActionButtons/AddPropertyMenu';

export interface ItemFieldsTabProps {
  selectedItem: FieldNode;
}

export const ItemFieldsTab = ({ selectedItem }: ItemFieldsTabProps) => {
  const addProperty = useAddProperty();

  const numberOfChildNodes = selectedItem.children.length;
  const prevNumberOfChildNodes = usePrevious<number>(numberOfChildNodes) ?? 0;

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

  const onAddPropertyClicked = (
    event: BaseSyntheticEvent,
    kind: ObjectKind,
    fieldType?: FieldType,
  ) => {
    event.preventDefault();
    addProperty(kind, fieldType, selectedItem.pointer);
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
            {propertyItems.map(({ kind, fieldType, icon: Icon }) => (
              <DropdownMenu.Item
                key={`${kind}-${fieldType}`}
                value={fieldType}
                onClick={(e) => onAddPropertyClicked(e, kind, fieldType)}
              >
                {<Icon />}
                {t(`schema_editor.${fieldType || kind}`)}
              </DropdownMenu.Item>
            ))}
          </DropdownMenu.Group>
        </DropdownMenu.Content>
      </DropdownMenu>
    </div>
  );
};
