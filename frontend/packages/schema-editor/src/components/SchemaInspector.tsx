import React from 'react';
import { Alert, Tabs } from '@digdir/design-system-react';
import { isObject } from '@altinn/schema-model';
import { ItemPropertiesTab } from './SchemaInspector/ItemPropertiesTab';
import { ItemFieldsTab } from './SchemaInspector/ItemFieldsTab';
import classes from './SchemaInspector.module.css';
import { Divider } from 'app-shared/primitives';
import { useTranslation } from 'react-i18next';
import { selectedItemSelector } from '@altinn/schema-editor/selectors/schemaAndReduxSelectors';
import { useSchemaAndReduxSelector } from '../hooks/useSchemaAndReduxSelector';

export const SchemaInspector = () => {
  const { t } = useTranslation();

  const selectedItem = useSchemaAndReduxSelector(selectedItemSelector);

  if (!selectedItem) {
    return (
      <div>
        <p className={classes.noItem} id='no-item-paragraph'>
          {t('schema_editor.no_item_selected')}
        </p>
        <Divider />
      </div>
    );
  }

  const shouldDisplayFieldsTab = 'fieldType' in selectedItem && isObject(selectedItem);

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
          <ItemFieldsTab selectedItem={'fieldType' in selectedItem && selectedItem} />
        </Tabs.Content>
      ) : (
        <Alert severity='info'>{t('app_data_modelling.fields_information')}</Alert>
      )}
    </Tabs>
  );
};
