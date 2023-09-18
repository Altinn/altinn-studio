import React, { useEffect, useState } from 'react';
import { Tabs } from '@digdir/design-system-react';
import type { TabItem } from '@digdir/design-system-react';
import { FieldType, ObjectKind, pointerIsDefinition } from '@altinn/schema-model';
import { ItemPropertiesTab } from './SchemaInspector/ItemPropertiesTab';
import { ItemFieldsTab } from './SchemaInspector/ItemFieldsTab';
import classes from './SchemaInspector.module.css';
import { Divider } from 'app-shared/primitives';
import { useTranslation } from 'react-i18next';
import { selectedItemSelector } from '@altinn/schema-editor/selectors/schemaAndReduxSelectors';
import { useSchemaAndReduxSelector } from '../hooks/useSchemaAndReduxSelector';

export interface ISchemaInspectorProps {
  setSelectedType?: (selectedItem: any) => void;
}

export const SchemaInspector = ({ setSelectedType }: ISchemaInspectorProps) => {
  const { t } = useTranslation();

  enum TabValue {
    Properties = 'properties',
    Fields = 'fields',
  }
  const [tabsFor, setTabsFor] = useState<string>(undefined);
  const [activeTab, setActiveTab] = useState<string>(TabValue.Properties);
  const [tabItems, setTabItems] = useState<TabItem[]>([
    {
      name: t('schema_editor.properties'),
      content: null,
      value: TabValue.Properties,
    },
  ]);

  const selectedItem = useSchemaAndReduxSelector(selectedItemSelector);

  useEffect(() => {
    if (selectedItem && pointerIsDefinition(selectedItem.pointer)) {
      setSelectedType(selectedItem);
    }
  }, [selectedItem, setSelectedType]);

  useEffect(() => {
    if (!selectedItem) return;
    if (tabsFor !== selectedItem.pointer) setActiveTab(TabValue.Properties);
    const tabs = [
      {
        name: t('schema_editor.properties'),
        content: <ItemPropertiesTab selectedItem={selectedItem} />,
        value: TabValue.Properties,
      },
    ];
    if (
      selectedItem?.fieldType === FieldType.Object &&
      selectedItem.objectKind !== ObjectKind.Combination &&
      selectedItem.objectKind !== ObjectKind.Reference
    ) {
      tabs.push({
        name: t('schema_editor.fields'),
        content: <ItemFieldsTab selectedItem={selectedItem} />,
        value: TabValue.Fields,
      });
    }
    setTabsFor(selectedItem.pointer);
    setTabItems(tabs);
  }, [activeTab, TabValue.Fields, TabValue.Properties, selectedItem, tabsFor]); // eslint-disable-line react-hooks/exhaustive-deps

  const switchTab = (tabValue: string) => {
    if (
      (tabValue === TabValue.Fields.toString() && selectedItem.fieldType !== FieldType.Object) ||
      !selectedItem
    ) {
      setActiveTab(TabValue.Properties);
    } else {
      setActiveTab(tabValue);
    }
  };

  if (selectedItem) {
    return (
      <div className={classes.root}>
        <Tabs activeTab={activeTab} items={tabItems} onChange={switchTab} />
      </div>
    );
  }

  return (
    <div>
      <p className={classes.noItem} id='no-item-paragraph'>
        {t('schema_editor.no_item_selected')}
      </p>
      <Divider />
    </div>
  );
};
