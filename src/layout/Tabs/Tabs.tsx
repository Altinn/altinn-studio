import React, { useState } from 'react';

import { Tabs as DesignsystemetTabs } from '@digdir/designsystemet-react';

import { useRegisterNodeNavigationHandler } from 'src/features/form/layout/NavigateToNode';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { GenericComponent } from 'src/layout/GenericComponent';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import { useNodeTraversalSelector } from 'src/utils/layout/useNodeTraversal';
import { typedBoolean } from 'src/utils/typing';
import type { PropsFromGenericComponent } from 'src/layout';

export const Tabs = ({ node }: PropsFromGenericComponent<'Tabs'>) => {
  const size = useNodeItem(node, (i) => i.size);
  const defaultTab = useNodeItem(node, (i) => i.defaultTab);
  const tabs = useNodeItem(node, (i) => i.tabsInternal);
  const [activeTab, setActiveTab] = useState<string | undefined>(defaultTab ?? tabs.at(0)?.id);

  const traversalSelector = useNodeTraversalSelector();
  useRegisterNodeNavigationHandler(async (targetNode) => {
    const parents = traversalSelector((t) => t.with(targetNode).parents(), [targetNode]);
    for (const parent of parents ?? []) {
      if (parent === node) {
        const targetTabId = tabs.find((tab) => tab.children.some((child) => child === targetNode))?.id;
        if (targetTabId) {
          setActiveTab(targetTabId);
          return true;
        }
      }
    }
    return false;
  });

  return (
    <ComponentStructureWrapper node={node}>
      <DesignsystemetTabs
        defaultValue={activeTab}
        value={activeTab}
        onChange={(tabId) => setActiveTab(tabId)}
        size={size}
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
          <DesignsystemetTabs.Content
            key={tab.id}
            value={tab.id}
            role='tabpanel'
            style={{
              backgroundColor: 'white',
            }}
          >
            {tab.children.filter(typedBoolean).map((node) => (
              <GenericComponent
                key={node.id}
                node={node}
              />
            ))}
          </DesignsystemetTabs.Content>
        ))}
      </DesignsystemetTabs>
    </ComponentStructureWrapper>
  );
};

function TabHeader({
  id,
  title,
  icon,
  isActive,
}: {
  id: string;
  title: string;
  icon: string | undefined;
  isActive?: boolean;
}) {
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
      style={{
        backgroundColor: isActive ? 'white' : 'transparent',
      }}
      tabIndex={0}
    >
      {!!icon && (
        <img
          src={icon}
          alt=''
          style={{
            width: '24px',
          }}
        />
      )}
      <Lang id={translatedTitle} />
    </DesignsystemetTabs.Tab>
  );
}
