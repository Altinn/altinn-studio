import React from 'react';

import { Heading } from '@digdir/designsystemet-react';
import cn from 'classnames';
import type { HeadingProps } from '@digdir/designsystemet-react';

import { ConditionalWrapper } from 'src/app-components/ConditionalWrapper/ConditionalWrapper';
import { Flex } from 'src/app-components/Flex/Flex';
import { Lang } from 'src/features/language/Lang';
import classes from 'src/layout/Group/GroupSummary.module.css';
import { ComponentSummary, SummaryFlexForContainer } from 'src/layout/Summary2/SummaryComponent2/ComponentSummary';
import { useSummaryProp } from 'src/layout/Summary2/summaryStoreContext';
import { useNode } from 'src/utils/layout/NodesContext';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

type GroupComponentSummaryProps = {
  componentNode: LayoutNode<'Group'>;
  hierarchyLevel?: number;
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

interface ChildComponentProps extends Pick<GroupComponentSummaryProps, 'hierarchyLevel'> {
  id: string;
}

function ChildComponent({ id, hierarchyLevel }: ChildComponentProps) {
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
        />
      </Flex>
    );
  }

  return <ComponentSummary target={child} />;
}

export const GroupSummary = ({ componentNode, hierarchyLevel = 0 }: GroupComponentSummaryProps) => {
  const title = useNodeItem(componentNode, (i) => i.textResourceBindings?.title);
  const summaryTitle = useNodeItem(componentNode, (i) => i.textResourceBindings?.summaryTitle);
  const headingLevel = getHeadingLevel(hierarchyLevel);
  const isNestedGroup = hierarchyLevel > 0;

  const dataTestId = hierarchyLevel > 0 ? `summary-group-component-${hierarchyLevel}` : 'summary-group-component';
  const childComponents = useNodeItem(componentNode, (i) => i.childComponents);
  const hideEmptyFields = useSummaryProp('hideEmptyFields');

  return (
    <ConditionalWrapper
      condition={hierarchyLevel === 0}
      wrapper={(children) => (
        <SummaryFlexForContainer
          hideWhen={hideEmptyFields}
          target={componentNode}
        >
          {children}
        </SummaryFlexForContainer>
      )}
    >
      <section
        className={cn(classes.groupContainer, { [classes.nested]: isNestedGroup })}
        data-testid={dataTestId}
      >
        {(summaryTitle || title) && (
          <Heading
            data-size={isNestedGroup ? 'xs' : 'sm'}
            level={headingLevel}
          >
            <Lang id={summaryTitle ?? title} />
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
            />
          ))}
        </Flex>
      </section>
    </ConditionalWrapper>
  );
};
