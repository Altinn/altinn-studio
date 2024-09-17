import React, { useEffect } from 'react';
import type { FieldType, FieldNode, ObjectKind } from '@altinn/schema-model';
import { isField, isReference } from '@altinn/schema-model';
import classes from './ItemFieldsTab.module.css';
import { StudioDropdownMenu, usePrevious } from '@studio/components';
import { PlusIcon } from '@studio/icons';
import { useTranslation } from 'react-i18next';
import { ItemFieldsTable } from './ItemFieldsTable';
import { useAddProperty } from '@altinn/schema-editor/hooks/useAddProperty';
import { getLastNameField } from '@altinn/schema-editor/components/SchemaInspector/ItemFieldsTab/domUtils';
import { AddPropertiesMenu } from '../../AddPropertiesMenu';

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

  const onAddPropertyClicked = (kind: ObjectKind, fieldType?: FieldType) => {
    event.preventDefault();
    addProperty(kind, fieldType, selectedItem.schemaPointer);
  };
  const readonly = isReference(selectedItem);

  return (
    <div className={classes.root}>
      {isField(selectedItem) && numberOfChildNodes > 0 && (
        <ItemFieldsTable readonly={readonly} selectedItem={selectedItem} />
      )}
      <StudioDropdownMenu
        anchorButtonProps={{
          children: t('schema_editor.add_property'),
          color: 'second',
          icon: <PlusIcon />,
          variant: 'secondary',
        }}
        size='small'
        placement='bottom-start'
      >
        <AddPropertiesMenu onItemClick={onAddPropertyClicked} />
      </StudioDropdownMenu>
    </div>
  );
};
