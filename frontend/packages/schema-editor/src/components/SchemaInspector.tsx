import React, { useEffect, useState } from 'react';
import { Tabs } from '@digdir/design-system-react';
import type { TabItem } from '@digdir/design-system-react';
import type { UiSchemaNode } from '@altinn/schema-model';
import { FieldType, ObjectKind } from '@altinn/schema-model';
import { ItemPropertiesTab } from './SchemaInspector/ItemPropertiesTab';
import { ItemFieldsTab } from './SchemaInspector/ItemFieldsTab';
import classes from './SchemaInspector.module.css';
import { Divider } from 'app-shared/primitives';
import { useTranslation } from 'react-i18next';

export interface ISchemaInspectorProps {
  selectedItem?: UiSchemaNode;
}

export const SchemaInspector = ({ selectedItem }: ISchemaInspectorProps) => {
  const translation = useTranslation();
  const t = (key: string) => translation.t('schema_editor.' + key);
  enum TabValue {
    Properties = 'properties',
    Fields = 'fields'
  }
  const [tabsFor, setTabsFor] = useState<string>(undefined);
  const [activeTab, setActiveTab] = useState<string>(TabValue.Properties);
  const [tabItems, setTabItems] = useState<TabItem[]>([
    {
      name: t(TabValue.Properties),
      content: null,
      value: TabValue.Properties
    }
  ]);

  useEffect(() => {
    if (!selectedItem) return;
    if (tabsFor !== selectedItem.pointer) setActiveTab(TabValue.Properties);
    const tabs = [
      {
        name: t(TabValue.Properties),
        content: <ItemPropertiesTab selectedItem={selectedItem} />,
        value: TabValue.Properties
      }
    ];
    if (
      selectedItem?.fieldType === FieldType.Object &&
      selectedItem.objectKind !== ObjectKind.Combination &&
      selectedItem.objectKind !== ObjectKind.Reference
    ) {
      tabs.push({
        name: t(TabValue.Fields),
        content: <ItemFieldsTab selectedItem={selectedItem} />,
        value: TabValue.Fields
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
      <div className={classes.root} data-testid='schema-inspector'>
        <Tabs activeTab={activeTab} items={tabItems} onChange={switchTab} />
      </div>
    );
  }

  return (
    <div>
      <p className={classes.noItem} id='no-item-paragraph'>
        {t('no_item_selected')}
      </p>
      <Divider />
    </div>
  );
};
