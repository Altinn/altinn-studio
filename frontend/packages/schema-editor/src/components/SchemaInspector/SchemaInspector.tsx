import React from 'react';
import { Alert, Tabs } from '@digdir/design-system-react';
import type { UiSchemaNode } from '@altinn/schema-model';
import { isField, isObject } from '@altinn/schema-model';
import { ItemPropertiesTab } from './ItemPropertiesTab';
import { ItemFieldsTab } from './ItemFieldsTab';
import classes from './SchemaInspector.module.css';
import { Divider } from 'app-shared/primitives';
import { useTranslation } from 'react-i18next';
import { useSchemaEditorAppContext } from '../../hooks/useSchemaEditorAppContext';
import { useSavableSchemaModel } from '../../hooks/useSavableSchemaModel';

export const SchemaInspector = () => {
  const { t } = useTranslation();
  const { selectedNodePointer } = useSchemaEditorAppContext();
  const savableModel = useSavableSchemaModel();

  if (!selectedNodePointer) {
    return (
      <div>
        <p className={classes.noItem}>{t('schema_editor.no_item_selected')}</p>
        <Divider />
      </div>
    );
  }

  const selectedItem: UiSchemaNode = savableModel.getNode(selectedNodePointer);
  const shouldDisplayFieldsTab = isField(selectedItem) && isObject(selectedItem);

  return (
    <Tabs defaultValue={t('schema_editor.properties')} className={classes.root}>
      <Tabs.List>
        <Tabs.Tab value={t('schema_editor.properties')}>{t('schema_editor.properties')}</Tabs.Tab>
        <Tabs.Tab value={t('schema_editor.fields')}>{t('schema_editor.fields')}</Tabs.Tab>
      </Tabs.List>
      <Tabs.Content value={t('schema_editor.properties')}>
        <ItemPropertiesTab selectedItem={selectedItem} />
      </Tabs.Content>
      {shouldDisplayFieldsTab ? (
        <Tabs.Content value={t('schema_editor.fields')}>
          <ItemFieldsTab selectedItem={selectedItem} />
        </Tabs.Content>
      ) : (
        <Alert severity='info'>{t('app_data_modelling.fields_information')}</Alert>
      )}
    </Tabs>
  );
};
