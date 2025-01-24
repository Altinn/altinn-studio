import React from 'react';

import { Heading } from '@digdir/designsystemet-react';
import cn from 'classnames';
import type { HeadingProps } from '@digdir/designsystemet-react';

import { Flex } from 'src/app-components/Flex/Flex';
import { Lang } from 'src/features/language/Lang';
import classes from 'src/layout/Group/GroupSummary.module.css';
import { ComponentSummary } from 'src/layout/Summary2/SummaryComponent2/ComponentSummary';
import { useNode } from 'src/utils/layout/NodesContext';
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

function ChildComponent({
  id,
  hierarchyLevel,
  summaryOverride,
}: { id: string } & Pick<GroupComponentSummaryProps, 'hierarchyLevel' | 'summaryOverride'>) {
  const child = useNode(id);
  if (!child) {
    return null;
  }

  if (child.isType('Group')) {
    return (
      <Flex item>
        <GroupSummary
          componentNode={child}
          hierarchyLevel={hierarchyLevel ? hierarchyLevel + 1 : 1}
          summaryOverride={summaryOverride}
        />
      </Flex>
    );
  }

  const isCompact = summaryOverride?.isCompact;

  return (
    <ComponentSummary
      componentNode={child}
      isCompact={isCompact}
    />
  );
}

export const GroupSummary = ({ componentNode, hierarchyLevel = 0, summaryOverride }: GroupComponentSummaryProps) => {
  const title = useNodeItem(componentNode, (i) => i.textResourceBindings?.title);
  const summaryTitle = useNodeItem(componentNode, (i) => i.textResourceBindings?.summaryTitle);
  const headingLevel = getHeadingLevel(hierarchyLevel);
  const isNestedGroup = hierarchyLevel > 0;

  const dataTestId = hierarchyLevel > 0 ? `summary-group-component-${hierarchyLevel}` : 'summary-group-component';
  const childComponents = useNodeItem(componentNode, (i) => i.childComponents);

  return (
    <section
      className={cn(classes.groupContainer, { [classes.nested]: isNestedGroup })}
      data-testid={dataTestId}
    >
      {(summaryTitle || title) && (
        <Heading
          size={isNestedGroup ? 'xsmall' : 'small'}
          level={headingLevel}
        >
          <Lang
            id={summaryTitle ?? title}
            node={componentNode}
          />
        </Heading>
      )}
      <Flex
        container
        spacing={6}
        alignItems='flex-start'
      >
        {childComponents.map((childId) => (
          <ChildComponent
            key={childId}
            id={childId}
            hierarchyLevel={hierarchyLevel}
            summaryOverride={summaryOverride}
          />
        ))}
      </Flex>
    </section>
  );
};
