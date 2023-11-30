import type { BaseSyntheticEvent } from 'react';
import React, { useEffect } from 'react';
import type { FieldNode } from '@altinn/schema-model';
import { FieldType, isField, isReference, ObjectKind } from '@altinn/schema-model';
import classes from './ItemFieldsTab.module.css';
import { usePrevious } from 'app-shared/hooks/usePrevious';
import { Button } from '@digdir/design-system-react';
import { PlusIcon } from '@navikt/aksel-icons';
import { useTranslation } from 'react-i18next';
import { ItemFieldsTable } from './ItemFieldsTable';
import { useAddProperty } from '@altinn/schema-editor/hooks/useAddProperty';
import { getLastNameField } from '@altinn/schema-editor/components/SchemaInspector/ItemFieldsTab/domUtils';

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

  const onAddPropertyClicked = (event: BaseSyntheticEvent) => {
    event.preventDefault();
    addProperty(ObjectKind.Field, FieldType.String, selectedItem.pointer);
  };
  const readonly = isReference(selectedItem);

  return (
    <div className={classes.root}>
      {isField(selectedItem) && numberOfChildNodes > 0 && (
        <ItemFieldsTable readonly={readonly} selectedItem={selectedItem} />
      )}
      {!readonly && (
        <Button
          color='second'
          icon={<PlusIcon />}
          onClick={onAddPropertyClicked}
          variant='secondary'
          size='small'
        >
          {t('schema_editor.add_property')}
        </Button>
      )}
    </div>
  );
};
