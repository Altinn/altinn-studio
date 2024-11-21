import React from 'react';

import { Heading } from '@digdir/designsystemet-react';
import { Grid } from '@material-ui/core';

import { Lang } from 'src/features/language/Lang';
import { ComponentSummaryById } from 'src/layout/Summary2/SummaryComponent2/ComponentSummary';
import classes from 'src/layout/Tabs/TabsSummary.module.css';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import { typedBoolean } from 'src/utils/typing';
import type { BaseLayoutNode } from 'src/utils/layout/LayoutNode';

type TabsSummaryProps = {
  componentNode: BaseLayoutNode<'Tabs'>;
};

export const TabsSummary = ({ componentNode }: TabsSummaryProps) => {
  const tabs = useNodeItem(componentNode, (i) => i.tabsInternal);

  if (!tabs || tabs.length === 0) {
    return null;
  }

  return (
    <div
      className={classes.summaryContent}
      data-testid='summary-tabs-component'
    >
      {tabs.map((tab, index) => (
        <>
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
              size='xs'
              level={4}
            >
              <Lang
                id={tab.title}
                node={componentNode}
              />
            </Heading>
            <Grid
              container
              spacing={6}
              alignItems='flex-start'
            >
              {tab.childIds.filter(typedBoolean).map((nodeId) => (
                <ComponentSummaryById
                  key={nodeId}
                  componentId={nodeId}
                />
              ))}
            </Grid>
          </div>
        </>
      ))}
    </div>
  );
};
