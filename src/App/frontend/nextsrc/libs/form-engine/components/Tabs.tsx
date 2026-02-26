import React, { useState } from 'react';

import { Tabs as DesignsystemetTabs } from '@digdir/designsystemet-react';
import { useFormClient } from 'nextsrc/libs/form-client/react/provider';
import { useLanguage } from 'nextsrc/libs/form-client/react/useLanguage';
import { findComponentById } from 'nextsrc/libs/form-engine/utils/findComponent';
import classes from 'nextsrc/libs/form-engine/components/Tabs.module.css';
import type { ComponentProps } from 'nextsrc/libs/form-engine/components/index';

import type { CompTabsExternal } from 'src/layout/Tabs/config.generated';

const sizeMap: Record<string, 'sm' | 'md' | 'lg'> = {
  small: 'sm',
  medium: 'md',
  large: 'lg',
};

export const Tabs = ({ component, renderChildren }: ComponentProps) => {
  const props = component as CompTabsExternal;
  const { langAsString } = useLanguage();
  const client = useFormClient();
  const size = props.size ?? 'medium';
  const [activeTab, setActiveTab] = useState<string | undefined>(props.defaultTab ?? props.tabs.at(0)?.id);

  return (
    <DesignsystemetTabs
      defaultValue={activeTab}
      value={activeTab}
      onChange={(tabId) => setActiveTab(tabId)}
      data-size={sizeMap[size]}
    >
      <DesignsystemetTabs.List>
        {props.tabs.map((tab) => (
          <DesignsystemetTabs.Tab
            key={tab.id}
            value={tab.id}
            tabIndex={0}
            className={classes.tabHeader}
          >
            {!!tab.icon && (
              <img
                src={tab.icon}
                alt=''
                className={classes.icon}
              />
            )}
            {langAsString(tab.title)}
          </DesignsystemetTabs.Tab>
        ))}
      </DesignsystemetTabs.List>
      {props.tabs.map((tab) => {
        if (tab.id !== activeTab) {
          return null;
        }

        const childComponents = tab.children
          .map((childId) => findComponentById(client, childId))
          .filter((c): c is NonNullable<typeof c> => c != null);

        return (
          <DesignsystemetTabs.Panel
            key={tab.id}
            value={tab.id}
            role='tabpanel'
          >
            <div className={classes.tabContent}>{renderChildren(childComponents)}</div>
          </DesignsystemetTabs.Panel>
        );
      })}
    </DesignsystemetTabs>
  );
};
