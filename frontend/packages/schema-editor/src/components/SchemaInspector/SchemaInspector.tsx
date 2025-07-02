import React from 'react';
import { Tabs } from '@digdir/designsystemet-react';
import { ROOT_POINTER, type UiSchemaNode } from '@altinn/schema-model';
import { ItemPropertiesTab } from './ItemPropertiesTab';
import { ItemFieldsTab } from './ItemFieldsTab';
import classes from './SchemaInspector.module.css';
import { useTranslation } from 'react-i18next';
import { useSchemaEditorAppContext } from '../../hooks/useSchemaEditorAppContext';
import { useSavableSchemaModel } from '../../hooks/useSavableSchemaModel';
import { NoItemSelectedMessage } from '../NoItemSelectedMessage';
import { ItemMetadataTab } from './ItemMetadataTab';

enum SchemaInspectorTabs {
  Properties = 'Properties',
  Fields = 'Fields',
  Metadata = 'Metadata',
}

export const SchemaInspector = () => {
  const { t } = useTranslation();
  const { selectedUniquePointer } = useSchemaEditorAppContext();
  const savableModel = useSavableSchemaModel();

  if (!selectedUniquePointer) {
    return <NoItemSelectedMessage />;
  }

  console.log({
    selectedUniquePointer,
  });

  const selectedItemPath = selectedUniquePointer.replace(/\/\/([^/]+)/g, '/items/$1');
  console.log({ selectedItemPath });

  const selectedItem: UiSchemaNode = savableModel.getNodeByUniquePointer(selectedItemPath);

  return (
    <Tabs
      key={selectedItem.schemaPointer}
      defaultValue={SchemaInspectorTabs.Properties}
      className={classes.root}
    >
      <Tabs.List>
        <Tabs.Tab value={SchemaInspectorTabs.Properties}>{t('schema_editor.properties')}</Tabs.Tab>
        <Tabs.Tab value={SchemaInspectorTabs.Fields}>{t('schema_editor.fields')}</Tabs.Tab>
        {selectedItem.schemaPointer == ROOT_POINTER && (
          <Tabs.Tab value={SchemaInspectorTabs.Metadata}>{t('schema_editor.metadata')}</Tabs.Tab>
        )}
      </Tabs.List>
      <Tabs.Content value={SchemaInspectorTabs.Properties}>
        <ItemPropertiesTab selectedItem={selectedItem} />
      </Tabs.Content>
      <Tabs.Content value={SchemaInspectorTabs.Fields}>
        <ItemFieldsTab selectedItem={selectedItem} />
      </Tabs.Content>
      <Tabs.Content value={SchemaInspectorTabs.Metadata}>
        <ItemMetadataTab />
      </Tabs.Content>
    </Tabs>
  );
};
