import React, { useState } from 'react';

import { Tabs as DesignsystemetTabs } from '@digdir/designsystemet-react';

import { Flex } from 'src/app-components/Flex/Flex';
import { useLayoutLookups } from 'src/features/form/layout/LayoutsContext';
import { useRegisterNavigationHandler } from 'src/features/form/layout/NavigateToNode';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { GenericComponent } from 'src/layout/GenericComponent';
import classes from 'src/layout/Tabs/Tabs.module.css';
import { useExternalItem } from 'src/utils/layout/hooks';
import { typedBoolean } from 'src/utils/typing';
import type { PropsFromGenericComponent } from 'src/layout';

const sizeMap: Record<string, 'sm' | 'md' | 'lg'> = {
  small: 'sm',
  medium: 'md',
  large: 'lg',
};

export const Tabs = ({ baseComponentId }: PropsFromGenericComponent<'Tabs'>) => {
  const { size: _size, defaultTab, tabs } = useExternalItem(baseComponentId, 'Tabs');
  const size = _size ?? 'medium';
  const [activeTab, setActiveTab] = useState<string | undefined>(defaultTab ?? tabs.at(0)?.id);
  const layoutLookups = useLayoutLookups();

  useRegisterNavigationHandler(async (_indexedId, targetBaseId) => {
    let parent = layoutLookups.componentToParent[targetBaseId];
    while (parent?.type === 'node') {
      if (parent.id === baseComponentId) {
        const targetTabId = tabs.find((tab) => tab.children.some((childBaseId) => childBaseId === targetBaseId))?.id;
        if (targetTabId) {
          setActiveTab(targetTabId);
          return true;
        }
      }
      parent = layoutLookups.componentToParent[parent.id];
    }
    return false;
  });

  return (
    <ComponentStructureWrapper baseComponentId={baseComponentId}>
      <DesignsystemetTabs
        defaultValue={activeTab}
        value={activeTab}
        onChange={(tabId) => setActiveTab(tabId)}
        data-size={sizeMap[size]}
      >
        <DesignsystemetTabs.List>
          {tabs.map((tab) => (
            <TabHeader
              key={tab.id}
              id={tab.id}
              title={tab.title}
              icon={tab.icon}
              isActive={tab.id === activeTab}
            />
          ))}
        </DesignsystemetTabs.List>
        {tabs.map((tab) => (
          <DesignsystemetTabs.Panel
            key={tab.id}
            value={tab.id}
            role='tabpanel'
            className={classes.tabContent}
          >
            <Flex
              container
              spacing={6}
              alignItems='flex-start'
            >
              {tab.children.filter(typedBoolean).map((baseId) => (
                <GenericComponent
                  key={baseId}
                  baseComponentId={baseId}
                />
              ))}
            </Flex>
          </DesignsystemetTabs.Panel>
        ))}
      </DesignsystemetTabs>
    </ComponentStructureWrapper>
  );
};

function TabHeader({ id, title, icon }: { id: string; title: string; icon: string | undefined; isActive?: boolean }) {
  const { langAsString } = useLanguage();
  const translatedTitle = langAsString(title);

  if (icon) {
    const imgType = icon.split('.').at(-1);

    if (!imgType) {
      throw new Error('Image source is missing file type. Are you sure the image source is correct?');
    }
    if (!['svg', 'png', 'jpg', 'jpeg', 'gif', 'bmp', 'tiff'].includes(imgType.toLowerCase())) {
      throw new Error('Only images of the types: .svg, .png, .jpg, .jpeg, .gif, .bmp, .tiff, are supported');
    }
  }

  return (
    <DesignsystemetTabs.Tab
      key={id}
      value={id}
      tabIndex={0}
      className={classes.tabHeader}
    >
      {!!icon && (
        <img
          src={icon}
          alt=''
          className={classes.icon}
        />
      )}
      <Lang id={translatedTitle} />
    </DesignsystemetTabs.Tab>
  );
}
