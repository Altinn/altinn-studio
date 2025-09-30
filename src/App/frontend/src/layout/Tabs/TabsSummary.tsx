import React from 'react';

import { Heading } from '@digdir/designsystemet-react';

import { Flex } from 'src/app-components/Flex/Flex';
import { Lang } from 'src/features/language/Lang';
import { ComponentSummary, SummaryFlexForContainer } from 'src/layout/Summary2/SummaryComponent2/ComponentSummary';
import { useSummaryProp } from 'src/layout/Summary2/summaryStoreContext';
import classes from 'src/layout/Tabs/TabsSummary.module.css';
import { useHasCapability } from 'src/utils/layout/canRenderIn';
import { useExternalItem } from 'src/utils/layout/hooks';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export const TabsSummary = ({ targetBaseComponentId }: Summary2Props) => {
  const hideEmptyFields = useSummaryProp('hideEmptyFields');
  const { tabs } = useExternalItem(targetBaseComponentId, 'Tabs');
  const canRender = useHasCapability('renderInTabs');

  if (!tabs || tabs.length === 0) {
    return null;
  }

  return (
    <SummaryFlexForContainer
      targetBaseId={targetBaseComponentId}
      hideWhen={hideEmptyFields}
    >
      <div
        className={classes.summaryContent}
        data-testid='summary-tabs-component'
      >
        {tabs.map((tab, index) => (
          <div key={index}>
            {index != 0 && (
              <hr
                key={`${tab.title}-${index}-divider`}
                className={classes.tabDivider}
              />
            )}
            <div
              key={`${tab.title}-${index}`}
              className={classes.tabWrapper}
            >
              <Heading
                data-size='xs'
                level={4}
              >
                <Lang id={tab.title} />
              </Heading>
              <Flex
                container
                spacing={6}
                alignItems='flex-start'
              >
                {tab.children.filter(canRender).map((baseId) => (
                  <ComponentSummary
                    key={baseId}
                    targetBaseComponentId={baseId}
                  />
                ))}
              </Flex>
            </div>
          </div>
        ))}
      </div>
    </SummaryFlexForContainer>
  );
};
