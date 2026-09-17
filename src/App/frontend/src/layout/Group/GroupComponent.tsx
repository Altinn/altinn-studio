import React from 'react';
import type { JSX } from 'react';

import { ConditionalWrapper, Fieldset, FullWidthWrapper, HelpTextContainer, Panel } from '@app/form-component';
import { Expressions } from '@app/layout-contract/generated/expressions.generated';
import { Heading } from '@digdir/designsystemet-react';
import cn from 'classnames';
import type { HeadingLevel } from '@app/layout-contract/generated/common.generated';

import { FormStore } from 'src/features/form/FormContext';
import { Lang } from 'src/features/language/Lang';
import classes from 'src/layout/Group/GroupComponent.module.css';
import { useIndexedId } from 'src/utils/layout/DataModelLocation';
import { useIsHidden } from 'src/utils/layout/hidden';
import { getLayoutDepth } from 'src/utils/layout/hierarchy';
import { useComponentConfig } from 'src/utils/layout/hooks';
import { useEvalExpression } from 'src/utils/layout/useEvalExpression';

export interface IGroupComponent {
  baseComponentId: string;
  containerDivRef?: React.Ref<HTMLDivElement>;
  id?: string;
  isSummary?: boolean;
  renderLayoutComponent: (baseComponentId: string) => JSX.Element | null;
}

const headingSizes: { [k in HeadingLevel]: Parameters<typeof Heading>[0]['data-size'] } = {
  [2]: 'sm',
  [3]: 'xs',
  [4]: '2xs',
  [5]: '2xs',
  [6]: '2xs',
};

export function GroupComponent({
  baseComponentId,
  containerDivRef,
  id,
  isSummary,
  renderLayoutComponent,
}: IGroupComponent) {
  const config = useComponentConfig(baseComponentId, 'Group');
  const resolvedTitle = useEvalExpression(
    config.textResourceBindings?.title,
    Expressions.Group.textResourceBindings.title,
  );
  const resolvedSummaryTitle = useEvalExpression(
    config.textResourceBindings?.summaryTitle,
    Expressions.Group.textResourceBindings.summaryTitle,
  );
  const resolvedDescription = useEvalExpression(
    config.textResourceBindings?.description,
    Expressions.Group.textResourceBindings.description,
  );
  const resolvedHelp = useEvalExpression(
    config.textResourceBindings?.help,
    Expressions.Group.textResourceBindings.help,
  );

  const title = config.textResourceBindings?.title === undefined ? undefined : resolvedTitle;
  const summaryTitle = config.textResourceBindings?.summaryTitle === undefined ? undefined : resolvedSummaryTitle;
  const description = config.textResourceBindings?.description === undefined ? undefined : resolvedDescription;
  const help = config.textResourceBindings?.help === undefined ? undefined : resolvedHelp;

  const isHidden = useIsHidden(baseComponentId);

  const indexedId = useIndexedId(baseComponentId);
  const layoutLookups = FormStore.bootstrap.useLayoutLookups();
  const depth = getLayoutDepth(baseComponentId, layoutLookups);

  if (isHidden) {
    return null;
  }

  const parent = layoutLookups.componentToParent[baseComponentId];
  const isNested = parent?.type === 'node';
  const isPanel = config.groupingIndicator === 'panel';
  const isIndented = config.groupingIndicator === 'indented';
  const headingLevel = config.headingLevel ?? (Math.min(Math.max(depth + 1, 2), 6) as HeadingLevel);
  const headingSize = headingSizes[headingLevel];
  const legend = isSummary ? (summaryTitle ?? title) : title;

  return (
    <div className={cn(classes.groupWrapper, { [classes.panelWrapper]: isPanel, [classes.summary]: isSummary })}>
      <ConditionalWrapper
        condition={isPanel && !isSummary}
        wrapper={(child) => (
          <FullWidthWrapper>
            <Panel variant='info'>{child}</Panel>
          </FullWidthWrapper>
        )}
      >
        <Fieldset
          legend={
            legend ? (
              <Heading
                className={classes.legend}
                level={headingLevel}
                data-size={headingSize}
              >
                <Lang id={legend} />
              </Heading>
            ) : undefined
          }
          description={
            description && !isSummary ? (
              <span className={classes.description}>
                <Lang id={description} />
              </span>
            ) : undefined
          }
          help={
            help && !isSummary ? (
              <HelpTextContainer
                id={indexedId}
                title={legend}
                helpText={<Lang id={help} />}
              />
            ) : undefined
          }
        >
          <div
            data-componentid={indexedId}
            data-componentbaseid={baseComponentId}
            ref={containerDivRef}
            id={id ?? indexedId}
            data-testid='display-group-container'
            className={cn(classes.groupContainer, {
              [classes.indented]: isIndented && !isNested,
            })}
          >
            {config.children.map((id) => renderLayoutComponent(id))}
          </div>
        </Fieldset>
      </ConditionalWrapper>
    </div>
  );
}
