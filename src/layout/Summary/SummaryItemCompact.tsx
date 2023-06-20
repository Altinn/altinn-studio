import React from 'react';

import { useLanguage } from 'src/hooks/useLanguage';
import classes from 'src/layout/Summary/SummaryItemCompact.module.css';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export interface ICompactSummaryItem {
  targetNode: LayoutNode;
  displayData: string;
}

export function SummaryItemCompact({ targetNode, displayData }: ICompactSummaryItem) {
  const { lang } = useLanguage();
  const textBindings = targetNode.item.textResourceBindings;

  return (
    <div data-testid={'summary-item-compact'}>
      {textBindings?.title && (
        <span>
          {lang(textBindings.title)}
          {' : '}
        </span>
      )}
      {displayData ? (
        <span className={classes.data}>{displayData}</span>
      ) : (
        <span className={classes.emptyField}>{lang('general.empty_summary')}</span>
      )}
    </div>
  );
}
