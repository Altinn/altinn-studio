import { StudioTabs } from '@studio/components';
import { ROOT_POINTER, type UiSchemaNode } from '@altinn/schema-model';
import { ItemPropertiesTab } from './ItemPropertiesTab';
import { ItemFieldsTab } from './ItemFieldsTab';
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

  const selectedItem: UiSchemaNode = savableModel.getNodeByUniquePointer(selectedUniquePointer);

  return (
    <StudioTabs key={selectedItem.schemaPointer} defaultValue={SchemaInspectorTabs.Properties}>
      <StudioTabs.List>
        <StudioTabs.Tab value={SchemaInspectorTabs.Properties}>
          {t('schema_editor.properties')}
        </StudioTabs.Tab>
        <StudioTabs.Tab value={SchemaInspectorTabs.Fields}>
          {t('schema_editor.fields')}
        </StudioTabs.Tab>
        {selectedItem.schemaPointer == ROOT_POINTER && (
          <StudioTabs.Tab value={SchemaInspectorTabs.Metadata}>
            {t('schema_editor.metadata')}
          </StudioTabs.Tab>
        )}
      </StudioTabs.List>
      <StudioTabs.Panel value={SchemaInspectorTabs.Properties}>
        <ItemPropertiesTab selectedItem={selectedItem} />
      </StudioTabs.Panel>
      <StudioTabs.Panel value={SchemaInspectorTabs.Fields}>
        <ItemFieldsTab selectedItem={selectedItem} />
      </StudioTabs.Panel>
      {selectedItem.schemaPointer == ROOT_POINTER && (
        <StudioTabs.Panel value={SchemaInspectorTabs.Metadata}>
          <ItemMetadataTab />
        </StudioTabs.Panel>
      )}
    </StudioTabs>
  );
};
