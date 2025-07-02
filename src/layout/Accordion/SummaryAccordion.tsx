import React from 'react';

import cn from 'classnames';

import { useLanguage } from 'src/features/language/useLanguage';
import classes from 'src/layout/Accordion/SummaryAccordion.module.css';
import { GenericComponentByBaseId } from 'src/layout/GenericComponent';
import { ComponentSummaryById, SummaryFlexForContainer } from 'src/layout/Summary2/SummaryComponent2/ComponentSummary';
import { useSummaryProp } from 'src/layout/Summary2/summaryStoreContext';
import { useHasCapability } from 'src/utils/layout/canRenderIn';
import { useComponentIdMutator } from 'src/utils/layout/DataModelLocation';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
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

export function SummaryAccordionComponent({ targetNode }: SummaryRendererProps<'Accordion'>) {
  const { textResourceBindings, headingLevel, children } = useItemWhenType(targetNode.baseId, 'Accordion');
  const { langAsString } = useLanguage();

  const title = langAsString(textResourceBindings?.title);
  const Heading = getHeadingLevel(headingLevel);

  return (
    <div className={cn(classes.container)}>
      <div className={cn(classes.header, classes.padding)}>
        <Heading className={classes.paddingSmall}>{title}</Heading>
      </div>
      <div className={classes.padding}>
        {children.map((baseId) => (
          <GenericComponentByBaseId
            key={baseId}
            id={baseId}
          />
        ))}
      </div>
    </div>
  );
}

export function SummaryAccordionComponent2({ target }: Summary2Props<'Accordion'>) {
  const idMutator = useComponentIdMutator();
  const canRenderInAccordion = useHasCapability('renderInAccordion');
  const { textResourceBindings, headingLevel, children } = useItemWhenType(target.baseId, 'Accordion');
  const { langAsString } = useLanguage();

  const hideEmptyFields = useSummaryProp('hideEmptyFields');

  const title = langAsString(textResourceBindings?.title);
  const Heading = getHeadingLevel(headingLevel);

  return (
    <SummaryFlexForContainer
      hideWhen={hideEmptyFields}
      target={target}
    >
      <div className={cn(classes.container, classes.summary2width)}>
        <div className={cn(classes.header, classes.padding)}>
          <Heading className={classes.paddingSmall}>{title}</Heading>
        </div>
        <div className={classes.padding}>
          {children.filter(canRenderInAccordion).map((baseId) => (
            <ComponentSummaryById
              key={baseId}
              componentId={idMutator?.(baseId) ?? baseId}
            />
          ))}
        </div>
      </div>
    </SummaryFlexForContainer>
  );
}
