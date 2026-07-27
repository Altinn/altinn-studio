import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';

import { TabsLayout } from '@app/form-component';
import type { TabsLayoutTab } from '@app/form-component';

import { SearchParams } from 'src/core/routing/types';
import { FormStore } from 'src/features/form/FormContext';
import { AllComponentValidations } from 'src/features/validation/ComponentValidations';
import { GenericComponent } from 'src/layout/GenericComponent';
import { useExternalItem } from 'src/utils/layout/hooks';
import { useComponentStructureData } from 'src/utils/layout/useComponentStructureData';
import { getBaseComponentId } from 'src/utils/splitDashedKey';
import { typedBoolean } from 'src/utils/typing';
import type { PropsFromGenericComponent } from 'src/layout';

export const Tabs = ({ baseComponentId }: PropsFromGenericComponent<'Tabs'>) => {
  const { size, defaultTab, tabs } = useExternalItem(baseComponentId, 'Tabs');
  const { componentId, innerGrid, validationGrid, showValidationMessages } = useComponentStructureData(baseComponentId);
  const [activeTab, setActiveTab] = useState<string | undefined>(defaultTab ?? tabs.at(0)?.id);
  const layoutLookups = FormStore.bootstrap.useLayoutLookups();
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

  const layoutTabs: TabsLayoutTab[] = tabs.map((tab) => ({
    id: tab.id,
    title: tab.title,
    icon: tab.icon,
    content: (
      <>
        {tab.children.filter(typedBoolean).map((baseId) => (
          <GenericComponent
            key={baseId}
            baseComponentId={baseId}
          />
        ))}
      </>
    ),
  }));

  return (
    <TabsLayout
      size={size ?? 'medium'}
      tabs={layoutTabs}
      activeTab={activeTab}
      onActiveTabChange={setActiveTab}
      componentId={componentId}
      innerGrid={innerGrid}
      validationGrid={validationGrid}
      validationMessages={
        showValidationMessages ? <AllComponentValidations baseComponentId={baseComponentId} /> : undefined
      }
    />
  );
};
