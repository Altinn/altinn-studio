import React, { useEffect, useState } from 'react';
import { LegacyTabs } from '@digdir/design-system-react';
import type { LegacyTabItem } from '@digdir/design-system-react';
import { FieldType, isField, isObject, ObjectKind } from '@altinn/schema-model';
import { ItemPropertiesTab } from './SchemaInspector/ItemPropertiesTab';
import { ItemFieldsTab } from './SchemaInspector/ItemFieldsTab';
import classes from './SchemaInspector.module.css';
import { Divider } from 'app-shared/primitives';
import { useTranslation } from 'react-i18next';
import { selectedItemSelector } from '@altinn/schema-editor/selectors/schemaAndReduxSelectors';
import { useSchemaAndReduxSelector } from '../hooks/useSchemaAndReduxSelector';

export const SchemaInspector = () => {
  const { t } = useTranslation();

  enum TabValue {
    Properties = 'properties',
    Fields = 'fields',
  }
  const [tabsFor, setTabsFor] = useState<string>(undefined);
  const [activeTab, setActiveTab] = useState<string>(TabValue.Properties);
  const [tabItems, setTabItems] = useState<LegacyTabItem[]>([
    {
      name: t('schema_editor.properties'),
      content: null,
      value: TabValue.Properties,
    },
  ]);

  const selectedItem = useSchemaAndReduxSelector(selectedItemSelector);

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
      selectedItem.objectKind === ObjectKind.Field &&
      selectedItem.fieldType === FieldType.Object
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
      (tabValue === TabValue.Fields.toString() &&
        (!isField(selectedItem) || !isObject(selectedItem))) ||
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
        <LegacyTabs activeTab={activeTab} items={tabItems} onChange={switchTab} />
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
