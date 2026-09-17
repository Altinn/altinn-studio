import React from 'react';

import { Expressions } from '@app/layout-contract/generated/expressions.generated';
import cn from 'classnames';

import { useLanguage } from 'src/features/language/useLanguage';
import classes from 'src/layout/Accordion/SummaryAccordion.module.css';
import { GenericComponent } from 'src/layout/GenericComponent';
import { ComponentSummary, SummaryFlexForContainer } from 'src/layout/Summary2/SummaryComponent2/ComponentSummary';
import { useSummaryProp } from 'src/layout/Summary2/summaryStoreContext';
import { useHasCapability } from 'src/utils/layout/canRenderIn';
import { useComponentConfig } from 'src/utils/layout/hooks';
import { useEvalExpression } from 'src/utils/layout/useEvalExpression';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

function getHeadingLevel(headingLevel: number | undefined) {
  switch (headingLevel) {
    case 2:
      return 'h2';
    case 3:
      return 'h3';
    case 4:
      return 'h4';
    case 5:
      return 'h5';
    case 6:
      return 'h6';
    default:
      return 'h2';
  }
}

export function SummaryAccordionComponent({ targetBaseComponentId }: SummaryRendererProps) {
  const config = useComponentConfig(targetBaseComponentId, 'Accordion');
  const summaryTitle = useEvalExpression(
    config.textResourceBindings?.summaryTitle,
    Expressions.Accordion.textResourceBindings.summaryTitle,
  );
  const resolvedTitle = useEvalExpression(
    config.textResourceBindings?.title,
    Expressions.Accordion.textResourceBindings.title,
  );

  const { langAsString } = useLanguage();

  const title = langAsString(
    (config.textResourceBindings?.summaryTitle === undefined ? undefined : summaryTitle) ||
      (config.textResourceBindings?.title === undefined ? undefined : resolvedTitle),
  );
  const Heading = getHeadingLevel(config.headingLevel);

  return (
    <div className={cn(classes.container)}>
      <div className={cn(classes.header, classes.padding)}>
        <Heading className={classes.paddingSmall}>{title}</Heading>
      </div>
      <div className={classes.padding}>
        {config.children.map((baseId) => (
          <GenericComponent
            key={baseId}
            baseComponentId={baseId}
          />
        ))}
      </div>
    </div>
  );
}

export function SummaryAccordionComponent2({ targetBaseComponentId }: Summary2Props) {
  const canRenderInAccordion = useHasCapability('renderInAccordion');
  const config = useComponentConfig(targetBaseComponentId, 'Accordion');
  const summaryTitle2 = useEvalExpression(
    config.textResourceBindings?.summaryTitle,
    Expressions.Accordion.textResourceBindings.summaryTitle,
  );
  const title2 = useEvalExpression(
    config.textResourceBindings?.title,
    Expressions.Accordion.textResourceBindings.title,
  );

  const { langAsString } = useLanguage();

  const hideEmptyFields = useSummaryProp('hideEmptyFields');

  const title = langAsString(
    (config.textResourceBindings?.summaryTitle === undefined ? undefined : summaryTitle2) ||
      (config.textResourceBindings?.title === undefined ? undefined : title2),
  );
  const Heading = getHeadingLevel(config.headingLevel);

  return (
    <SummaryFlexForContainer
      hideWhen={hideEmptyFields}
      targetBaseId={targetBaseComponentId}
    >
      <div className={cn(classes.container, classes.summary2width)}>
        <div className={cn(classes.header, classes.padding)}>
          <Heading className={classes.paddingSmall}>{title}</Heading>
        </div>
        <div className={classes.padding}>
          {config.children.filter(canRenderInAccordion).map((baseId) => (
            <ComponentSummary
              key={baseId}
              targetBaseComponentId={baseId}
            />
          ))}
        </div>
      </div>
    </SummaryFlexForContainer>
  );
}
