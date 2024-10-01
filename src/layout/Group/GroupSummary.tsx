import React from 'react';

import { Heading } from '@digdir/designsystemet-react';
import { Grid } from '@material-ui/core';
import cn from 'classnames';
import type { HeadingProps } from '@digdir/designsystemet-react';

import { Lang } from 'src/features/language/Lang';
import classes from 'src/layout/Group/GroupSummary.module.css';
import { ComponentSummary } from 'src/layout/Summary2/SummaryComponent2/ComponentSummary';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { GroupSummaryOverrideProps } from 'src/layout/Summary2/config.generated';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

type GroupComponentSummaryProps = {
  componentNode: LayoutNode<'Group'>;
  hierarchyLevel?: number;
  summaryOverride?: GroupSummaryOverrideProps;
};

type HeadingLevel = HeadingProps['level'];

function getHeadingLevel(hierarchyLevel: number): HeadingLevel {
  const minimumHeadingLevel = 3;
  const maximumHeadingLevel = 6;
  const computedHeadingLevel = minimumHeadingLevel + hierarchyLevel;
  if (computedHeadingLevel <= maximumHeadingLevel) {
    return computedHeadingLevel as HeadingLevel;
  }
  if (computedHeadingLevel > maximumHeadingLevel) {
    return maximumHeadingLevel;
  }
}

const ChildComponents = ({ componentNode, hierarchyLevel, summaryOverride }: GroupComponentSummaryProps) => {
  const childComponents = useNodeItem(componentNode, (i) => i.childComponents);
  return childComponents.map((child) => {
    if (child?.isType('Group')) {
      return (
        <Grid
          item
          key={child?.id}
        >
          <GroupSummary
            componentNode={child}
            hierarchyLevel={hierarchyLevel ? hierarchyLevel + 1 : 1}
            key={componentNode.id}
            summaryOverride={summaryOverride}
          />
        </Grid>
      );
    }

    const isCompact = summaryOverride?.isCompact;

    return (
      <ComponentSummary
        key={child?.id}
        componentNode={child}
        isCompact={isCompact}
      />
    );
  });
};

export const GroupSummary = ({ componentNode, hierarchyLevel = 0, summaryOverride }: GroupComponentSummaryProps) => {
  const title = useNodeItem(componentNode, (i) => i.textResourceBindings?.title);
  const summaryTitle = useNodeItem(componentNode, (i) => i.textResourceBindings?.summaryTitle);
  const headingLevel = getHeadingLevel(hierarchyLevel);
  const isNestedGroup = hierarchyLevel > 0;

  const dataTestId = hierarchyLevel > 0 ? `summary-group-component-${hierarchyLevel}` : 'summary-group-component';

  return (
    <section
      className={cn(classes.groupContainer, { [classes.nested]: isNestedGroup })}
      data-testid={dataTestId}
    >
      <Heading
        size={isNestedGroup ? 'xsmall' : 'small'}
        level={headingLevel}
      >
        <Lang id={summaryTitle ?? title} />
      </Heading>
      <Grid
        container
        spacing={6}
        alignItems='flex-start'
      >
        <ChildComponents
          componentNode={componentNode}
          hierarchyLevel={hierarchyLevel}
          summaryOverride={summaryOverride}
        />
      </Grid>
    </section>
  );
};
