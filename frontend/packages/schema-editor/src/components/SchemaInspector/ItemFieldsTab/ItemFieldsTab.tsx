import React, { useEffect } from 'react';
import type { FieldType, FieldNode, ObjectKind } from '@altinn/schema-model';
import { isField, isReference } from '@altinn/schema-model';
import classes from './ItemFieldsTab.module.css';
import { usePrevious } from '@studio/components';
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
      <AddPropertiesMenu onItemClick={onAddPropertyClicked} />
    </div>
  );
};
