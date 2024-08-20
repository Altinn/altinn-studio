import React from 'react';

import cn from 'classnames';

import { useLanguage } from 'src/features/language/useLanguage';
import classes from 'src/layout/Accordion/SummaryAccordion.module.css';
import { GenericComponent } from 'src/layout/GenericComponent';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { SummaryRendererProps } from 'src/layout/LayoutComponent';

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
  const { textResourceBindings, headingLevel, childComponents } = useNodeItem(targetNode);
  const { langAsString } = useLanguage();

  const title = langAsString(textResourceBindings?.title);
  const Heading = getHeadingLevel(headingLevel);

  return (
    <div className={cn(classes.container)}>
      <div className={classes.header}>
        <Heading className={classes.paddingSmall}>{title}</Heading>
      </div>
      <div className={classes.padding}>
        {childComponents.map((node) => (
          <GenericComponent
            key={node.id}
            node={node}
          />
        ))}
      </div>
    </div>
  );
}
