import React from 'react';

import { ConditionalWrapper, Flex } from '@app/form-component';
import { Expressions } from '@app/layout-contract/generated/expressions.generated';
import { Heading } from '@digdir/designsystemet-react';
import cn from 'classnames';
import type { HeadingProps } from '@digdir/designsystemet-react';

import { Lang } from 'src/features/language/Lang';
import classes from 'src/layout/Group/GroupSummary.module.css';
import { ComponentSummary, SummaryFlexForContainer } from 'src/layout/Summary2/SummaryComponent2/ComponentSummary';
import { useSummaryProp } from 'src/layout/Summary2/summaryStoreContext';
import { useComponentConfig } from 'src/utils/layout/hooks';
import { useEvalExpression } from 'src/utils/layout/useEvalExpression';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

interface GroupComponentSummaryProps extends Summary2Props {
  hierarchyLevel?: number;
}

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
  const child = useComponentConfig(id);
  if (!child) {
    return null;
  }

  if (child.type === 'Group') {
    return (
      <Flex item>
        <GroupSummary
          targetBaseComponentId={id}
          hierarchyLevel={hierarchyLevel ? hierarchyLevel + 1 : 1}
        />
      </Flex>
    );
  }

  return <ComponentSummary targetBaseComponentId={id} />;
}

export const GroupSummary = ({ targetBaseComponentId, hierarchyLevel = 0 }: GroupComponentSummaryProps) => {
  const config = useComponentConfig(targetBaseComponentId, 'Group');
  const resolvedSummaryTitle = useEvalExpression(
    config.textResourceBindings?.summaryTitle,
    Expressions.Group.textResourceBindings.summaryTitle,
  );
  const resolvedTitle = useEvalExpression(
    config.textResourceBindings?.title,
    Expressions.Group.textResourceBindings.title,
  );

  const title =
    (config.textResourceBindings?.summaryTitle === undefined ? undefined : resolvedSummaryTitle) ||
    (config.textResourceBindings?.title === undefined ? undefined : resolvedTitle);
  const summaryTitle = config.textResourceBindings?.summaryTitle === undefined ? undefined : resolvedSummaryTitle;
  const headingLevel = getHeadingLevel(hierarchyLevel);
  const isNestedGroup = hierarchyLevel > 0;
  const dataTestId = hierarchyLevel > 0 ? `summary-group-component-${hierarchyLevel}` : 'summary-group-component';
  const hideEmptyFields = useSummaryProp('hideEmptyFields');
  return (
    <ConditionalWrapper
      condition={hierarchyLevel === 0}
      wrapper={(children) => (
        <SummaryFlexForContainer
          hideWhen={hideEmptyFields}
          targetBaseId={targetBaseComponentId}
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
          {config.children.map((childId) => (
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
