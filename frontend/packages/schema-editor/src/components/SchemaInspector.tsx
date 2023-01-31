import React, { useEffect, useState } from 'react';
import { Tabs } from '@digdir/design-system-react';
import type { TabItem } from '@digdir/design-system-react';
import type { UiSchemaNode } from '@altinn/schema-model';
import { FieldType, ObjectKind } from '@altinn/schema-model';
import { getTranslation } from '../utils/language';
import { ItemPropertiesTab } from './SchemaInspector/ItemPropertiesTab';
import { ItemFieldsTab } from './SchemaInspector/ItemFieldsTab';
import type { ILanguage } from '../types';
import classes from './SchemaInspector.module.css';
import { Divider } from 'app-shared/primitives';

export interface ISchemaInspectorProps {
  language: ILanguage;
  selectedItem?: UiSchemaNode;
}

export const SchemaInspector = ({ language, selectedItem }: ISchemaInspectorProps) => {
  const t = useCallback((key: string) => getTranslation(key, language), [language]);
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
        content: <ItemPropertiesTab selectedItem={selectedItem} language={language} />,
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
        content: <ItemFieldsTab selectedItem={selectedItem} language={language} />,
        value: TabValue.Fields
      });
    }
    setTabsFor(selectedItem.pointer);
    setTabItems(tabs);
  }, [activeTab, TabValue.Fields, TabValue.Properties, language, selectedItem, t, tabsFor]);

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
