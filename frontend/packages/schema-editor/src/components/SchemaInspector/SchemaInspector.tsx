import React from 'react';
import { Tabs } from '@digdir/designsystemet-react';
import type { UiSchemaNode } from '@altinn/schema-model';
import { ItemPropertiesTab } from './ItemPropertiesTab';
import { ItemFieldsTab } from './ItemFieldsTab';
import classes from './SchemaInspector.module.css';
import { useTranslation } from 'react-i18next';
import { useSchemaEditorAppContext } from '../../hooks/useSchemaEditorAppContext';
import { useSavableSchemaModel } from '../../hooks/useSavableSchemaModel';
import { NoItemSelectedMessage } from '../NoItemSelectedMessage';

enum SchemaInspectorTabs {
  Properties = 'Properties',
  Fields = 'Fields',
}

export const SchemaInspector = () => {
  const { t } = useTranslation();
  const { selectedUniquePointer } = useSchemaEditorAppContext();
  const savableModel = useSavableSchemaModel();

  if (!selectedUniquePointer) {
    return <NoItemSelectedMessage />;
  }

  const selectedItem: UiSchemaNode = savableModel.getNodeByUniquePointer(selectedUniquePointer);

  return (
    <Tabs defaultValue={SchemaInspectorTabs.Properties} className={classes.root}>
      <Tabs.List>
        <Tabs.Tab value={SchemaInspectorTabs.Properties}>{t('schema_editor.properties')}</Tabs.Tab>
        <Tabs.Tab value={SchemaInspectorTabs.Fields}>{t('schema_editor.fields')}</Tabs.Tab>
      </Tabs.List>
      <Tabs.Content value={SchemaInspectorTabs.Properties}>
        <ItemPropertiesTab selectedItem={selectedItem} />
      </Tabs.Content>
      <Tabs.Content value={SchemaInspectorTabs.Fields}>
        <ItemFieldsTab selectedItem={selectedItem} />
      </Tabs.Content>
    </Tabs>
  );
};
