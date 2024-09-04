import React from 'react';

import { Heading, Paragraph } from '@digdir/designsystemet-react';
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
  parentId?: string;
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

const ChildComponents = ({ componentNode, hierarchyLevel, summaryOverride, parentId }: GroupComponentSummaryProps) => {
  const childComponents = useNodeItem(componentNode, (i) => i.childComponents);
  return (
    childComponents.length &&
    childComponents.map((child) => {
      if (child?.isType('Group')) {
        return (
          <GroupSummary
            componentNode={child}
            hierarchyLevel={hierarchyLevel ? hierarchyLevel + 1 : 1}
            key={componentNode.id}
            summaryOverride={summaryOverride}
          />
        );
      } else {
        const isCompact = summaryOverride?.isCompact;

        return (
          <div
            key={child?.id}
            className={cn(classes.childItem)}
          >
            <ComponentSummary
              componentNode={child}
              isCompact={isCompact}
            />
          </div>
        );
      }
    })
  );
};

export const GroupSummary = ({ componentNode, hierarchyLevel = 0, summaryOverride }: GroupComponentSummaryProps) => {
  const title = useNodeItem(componentNode, (i) => i.textResourceBindings?.title);
  const summaryTitle = useNodeItem(componentNode, (i) => i.textResourceBindings?.summaryTitle);
  const description = useNodeItem(componentNode, (i) => i.textResourceBindings?.description);
  const headingLevel = getHeadingLevel(hierarchyLevel);
  const isNestedGroup = hierarchyLevel > 0;
  return (
    <section
      className={isNestedGroup ? cn(classes.groupContainer, classes.nested) : cn(classes.groupContainer)}
      data-testid={`summary-group-component${hierarchyLevel > 0 ? `-${hierarchyLevel}` : ''}`}
    >
      <div className={cn(classes.groupHeading)}>
        <Heading
          size={isNestedGroup ? 'xsmall' : 'small'}
          level={headingLevel}
        >
          <Lang id={summaryTitle ?? title} />
        </Heading>
        <Paragraph className={cn(classes.description)}>
          <Lang id={description} />
        </Paragraph>
      </div>
      <ChildComponents
        componentNode={componentNode}
        hierarchyLevel={hierarchyLevel}
        summaryOverride={summaryOverride}
        parentId={componentNode.baseId}
      />
    </section>
  );
};
