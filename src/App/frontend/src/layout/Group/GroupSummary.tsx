import React from 'react';

import { Flex } from '@app/form-component';
import { Expressions } from '@app/layout-contract/generated/expressions.generated';
import { Heading } from '@digdir/designsystemet-react';
import cn from 'classnames';
import type { HeadingLevel } from '@app/layout-contract/generated/common.generated';

import { Lang } from 'src/features/language/Lang';
import classes from 'src/layout/Group/GroupSummary.module.css';
import { SummaryLabel } from 'src/layout/Summary2/CommonSummaryComponents/SummaryLabel';
import { EmptyChildrenBoundary, useReportSummaryRender } from 'src/layout/Summary2/isEmpty/EmptyChildrenContext';
import {
  ComponentSummary,
  SummaryContains,
  SummaryFlexForContainer,
  useIsHiddenInSummary,
} from 'src/layout/Summary2/SummaryComponent2/ComponentSummary';
import { useSummaryProp } from 'src/layout/Summary2/summaryStoreContext';
import { useComponentConfig } from 'src/utils/layout/hooks';
import { useEvalOptionalText } from 'src/utils/layout/useEvalExpression';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

interface GroupComponentSummaryProps extends Summary2Props {
  hierarchyLevel?: number;
}

const headingSizes = { 2: 'sm', 3: 'xs', 4: '2xs', 5: '2xs', 6: '2xs' } as const;

function getHeadingLevel(hierarchyLevel: number): HeadingLevel {
  const minimumHeadingLevel = 3;
  const maximumHeadingLevel = 6;
  return Math.min(minimumHeadingLevel + hierarchyLevel, maximumHeadingLevel) as HeadingLevel;
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
      <NestedGroupSummary
        targetBaseComponentId={id}
        hierarchyLevel={hierarchyLevel ? hierarchyLevel + 1 : 1}
      />
    );
  }

  return <ComponentSummary targetBaseComponentId={id} />;
}

function NestedGroupSummary(props: GroupComponentSummaryProps) {
  const hidden = useIsHiddenInSummary(props.targetBaseComponentId);
  useReportSummaryRender(hidden ? SummaryContains.EmptyValueNotRequired : undefined);

  return (
    <EmptyChildrenBoundary reportSelf={!hidden}>
      <GroupSummary {...props} />
    </EmptyChildrenBoundary>
  );
}

export const GroupSummary = ({ targetBaseComponentId, hierarchyLevel = 0 }: GroupComponentSummaryProps) => {
  const config = useComponentConfig(targetBaseComponentId, 'Group');
  const summaryTitle = useEvalOptionalText(
    config.textResourceBindings?.summaryTitle,
    Expressions.Group.textResourceBindings.summaryTitle,
  );
  const resolvedTitle = useEvalOptionalText(
    config.textResourceBindings?.title,
    Expressions.Group.textResourceBindings.title,
  );

  const title = summaryTitle || resolvedTitle;
  const headingLevel = config.headingLevel ?? getHeadingLevel(hierarchyLevel);
  const isNestedGroup = hierarchyLevel > 0;
  const dataTestId = hierarchyLevel > 0 ? `summary-group-component-${hierarchyLevel}` : 'summary-group-component';
  const hideEmptyFields = useSummaryProp('hideEmptyFields');
  return (
    <SummaryFlexForContainer
      hideWhen={hideEmptyFields}
      targetBaseId={targetBaseComponentId}
    >
      <section
        className={cn(classes.groupContainer, { [classes.nested]: isNestedGroup })}
        data-testid={dataTestId}
      >
        {(summaryTitle || title) && (
          <SummaryLabel
            baseComponentId={targetBaseComponentId}
            title={<Lang id={title} />}
          >
            <Heading
              data-size={config.headingLevel ? headingSizes[config.headingLevel] : isNestedGroup ? 'xs' : 'sm'}
              level={headingLevel}
            >
              <Lang id={summaryTitle ?? title} />
            </Heading>
          </SummaryLabel>
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
    </SummaryFlexForContainer>
  );
};
