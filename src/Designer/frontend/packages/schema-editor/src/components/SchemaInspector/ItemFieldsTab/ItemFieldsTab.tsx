import React, { useEffect } from 'react';
import type { FieldType, FieldNode, ObjectKind } from '@altinn/schema-model/index';
import { isField, isObject, isReference } from '@altinn/schema-model/index';
import classes from './ItemFieldsTab.module.css';
import { usePrevious } from '@studio/components-legacy';
import { ItemFieldsTable } from './ItemFieldsTable';
import { useAddProperty } from '@altinn/schema-editor/hooks/useAddProperty';
import { getLastNameField } from '@altinn/schema-editor/components/SchemaInspector/ItemFieldsTab/domUtils';
import { AddPropertiesMenu } from '../../AddPropertiesMenu';
import { Alert } from '@digdir/designsystemet-react';
import type { UiSchemaNode } from '@altinn/schema-model/types';
import { useTranslation } from 'react-i18next';

export type ItemFieldsTabProps = {
  selectedItem: UiSchemaNode;
};

export function ItemFieldsTab({ selectedItem }: ItemFieldsTabProps): React.ReactElement {
  const { t } = useTranslation();

  const shouldDisplayFieldsTabContent = isField(selectedItem) && isObject(selectedItem);

  return shouldDisplayFieldsTabContent ? (
    <ItemFieldsTabContent selectedItem={selectedItem} />
  ) : (
    <Alert size='small'>{t('schema_editor.fields_not_available_on_type')}</Alert>
  );
}

type ItemFieldsTabContentProps = {
  selectedItem: FieldNode;
};

const ItemFieldsTabContent = ({ selectedItem }: ItemFieldsTabContentProps) => {
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
