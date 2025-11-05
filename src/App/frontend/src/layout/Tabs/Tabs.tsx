import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { Tabs as DesignsystemetTabs } from '@digdir/designsystemet-react';

import { Flex } from 'src/app-components/Flex/Flex';
import { SearchParams } from 'src/core/routing/types';
import { useLayoutLookups } from 'src/features/form/layout/LayoutsContext';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { GenericComponent } from 'src/layout/GenericComponent';
import classes from 'src/layout/Tabs/Tabs.module.css';
import { useExternalItem } from 'src/utils/layout/hooks';
import { getBaseComponentId } from 'src/utils/splitDashedKey';
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

  const [searchParams] = useSearchParams();

  useEffect(() => {
    const targetIndexedId = searchParams.get(SearchParams.FocusComponentId);
    if (!targetIndexedId) {
      return;
    }
    const targetBaseComponentId = getBaseComponentId(targetIndexedId);

    let parent = layoutLookups.componentToParent[targetBaseComponentId];
    while (parent?.type === 'node') {
      if (parent.id === baseComponentId) {
        const targetTabId = tabs.find((tab) =>
          tab.children.some((childBaseId) => childBaseId === targetBaseComponentId),
        )?.id;
        if (targetTabId) {
          setActiveTab(targetTabId);
          return;
        }
      }
      parent = layoutLookups.componentToParent[parent.id];
    }
  }, [baseComponentId, layoutLookups.componentToParent, searchParams, tabs]);

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
        {tabs.map((tab) => {
          if (tab.id !== activeTab) {
            // Behavior changed to always render tab panels, so we override to conditionally render on our side. Since
            // we override styles, all hidden tabs were displayed after this change.
            // @see https://github.com/digdir/designsystemet/pull/3936
            return null;
          }

          return (
            <DesignsystemetTabs.Panel
              key={tab.id}
              value={tab.id}
              role='tabpanel'
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
          );
        })}
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
