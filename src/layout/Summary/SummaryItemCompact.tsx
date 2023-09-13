import React from 'react';

import { useLanguage } from 'src/hooks/useLanguage';
import classes from 'src/layout/Summary/SummaryItemCompact.module.css';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export interface ICompactSummaryItem {
  targetNode: LayoutNode;
  displayData: string;
}

export function SummaryItemCompact({ targetNode, displayData }: ICompactSummaryItem) {
  const { lang } = useLanguage(targetNode);
  const textBindings = 'textResourceBindings' in targetNode.item ? targetNode.item.textResourceBindings : undefined;
  const summaryTitleTrb = textBindings && 'summaryTitle' in textBindings ? textBindings.summaryTitle : undefined;
  const titleTrb = textBindings && 'title' in textBindings ? textBindings.title : undefined;
  const title = lang(summaryTitleTrb ?? titleTrb);

  return (
    <div data-testid={'summary-item-compact'}>
      {title && (
        <span>
          {title}
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
