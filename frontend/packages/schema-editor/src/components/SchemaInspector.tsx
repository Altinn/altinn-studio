import React, { useState } from 'react';
import { Panel, PanelVariant } from '@altinn/altinn-design-system';
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
  const t = (key: string) => getTranslation(key, language);
  enum TabValue {
    Properties = 'properties',
    Fields = 'fields'
  }
  const [activeTab, setActiveTab] = useState<string>(TabValue.Properties);

  const switchTab = (tabValue: string) => {
    if ((tabValue === TabValue.Fields.toString() && selectedItem.fieldType !== FieldType.Object) || !selectedItem) {
      setActiveTab(TabValue.Properties);
    } else {
      setActiveTab(tabValue);
    }
  };

  const tabItems: TabItem[] = [
    {
      name: t(TabValue.Properties),
      content: <ItemPropertiesTab selectedItem={selectedItem} language={language} />,
      value: TabValue.Properties,
    }
  ];

  if (
    selectedItem?.fieldType === FieldType.Object &&
    selectedItem.objectKind !== ObjectKind.Combination &&
    selectedItem.objectKind !== ObjectKind.Reference
  ) {
    tabItems.push({
      name: t(TabValue.Fields),
      content: <ItemFieldsTab selectedItem={selectedItem} language={language} />,
      value: TabValue.Fields,
    });
  }

  return selectedItem ? (
    <div className={classes.root} data-testid='schema-inspector'>
      <Panel variant={PanelVariant.Warning} forceMobileLayout={true}>
        <span>{t('warning_under_development')}</span>
      </Panel>
      <Tabs
        activeTab={activeTab}
        items={tabItems}
        onChange={switchTab}
      />
    </div>
  ) : (
    <div>
      <p className={classes.noItem} id='no-item-paragraph'>
        {t('no_item_selected')}
      </p>
      <Divider />
    </div>
  );
};
