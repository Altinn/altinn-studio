import type { BaseSyntheticEvent } from 'react';
import React, { useEffect } from 'react';
import type { UiSchemaNode } from '@altinn/schema-model';
import { addProperty } from '@altinn/schema-model';
import classes from './ItemFieldsTab.module.css';
import { usePrevious } from 'app-shared/hooks/usePrevious';
import { Button } from '@digdir/design-system-react';
import { PlusIcon } from '@navikt/aksel-icons';
import { useTranslation } from 'react-i18next';
import { getFieldNodesSelector } from '@altinn/schema-editor/selectors/schemaSelectors';
import { useSchemaEditorAppContext } from '@altinn/schema-editor/hooks/useSchemaEditorAppContext';
import { ItemFieldsTable } from './ItemFieldsTable';

export interface ItemFieldsTabProps {
  selectedItem: UiSchemaNode;
}

export const ItemFieldsTab = ({ selectedItem }: ItemFieldsTabProps) => {
  const readonly = selectedItem.reference !== undefined;
  const { data, save } = useSchemaEditorAppContext();

  const fieldNodes = getFieldNodesSelector(selectedItem)(data);

  const numberOfChildNodes = fieldNodes.length;
  const prevNumberOfChildNodes = usePrevious<number>(numberOfChildNodes) ?? 0;

  useEffect(() => {
    // If the number of fields has increased, a new field has been added and should get focus
    if (numberOfChildNodes > prevNumberOfChildNodes) {
      const newNodeId = fieldNodes[fieldNodes.length - 1].domId;
      const newNodeInput = document.getElementById(newNodeId) as HTMLInputElement;
      newNodeInput?.focus();
      newNodeInput?.select();
    }
  }, [numberOfChildNodes, prevNumberOfChildNodes, fieldNodes]);

  const onAddPropertyClicked = (event: BaseSyntheticEvent) => {
    event.preventDefault();
    save(addProperty(data, { pointer: selectedItem.pointer, props: {} }));
  };

  const { t } = useTranslation();

  return (
    <div className={classes.root}>
      {fieldNodes.length > 0 && (
        <ItemFieldsTable fieldNodes={fieldNodes} readonly={readonly} selectedItem={selectedItem} />
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
