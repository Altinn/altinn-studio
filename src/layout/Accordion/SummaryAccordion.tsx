import React from 'react';

import cn from 'classnames';

import { useLanguage } from 'src/hooks/useLanguage';
import classes from 'src/layout/Accordion/SummaryAccordion.module.css';
import { GenericComponent } from 'src/layout/GenericComponent';
import type { ISummaryComponent } from 'src/layout/Summary/SummaryComponent';
import type { LayoutNodeFromType } from 'src/utils/layout/hierarchy.types';

interface ISummaryAccordionComponentProps {
  changeText: string | null;
  onChangeClick: () => void;
  summaryNode: LayoutNodeFromType<'Summary'>;
  targetNode: LayoutNodeFromType<'Accordion'>;
  overrides?: ISummaryComponent['overrides'];
}

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

export function SummaryAccordionComponent({ targetNode }: ISummaryAccordionComponentProps) {
  const { textResourceBindings, headingLevel } = targetNode.item;
  const { langAsString } = useLanguage();

  const title = langAsString(textResourceBindings?.title);
  const Heading = getHeadingLevel(headingLevel);

  return (
    <div className={cn(classes.container)}>
      <div className={classes.header}>
        <Heading className={classes.paddingSmall}>{title}</Heading>
      </div>
      <div className={classes.padding}>
        {targetNode.item.childComponents.map((n) => (
          <GenericComponent
            key={n.item.id}
            node={n}
          />
        ))}
      </div>
    </div>
  );
}
