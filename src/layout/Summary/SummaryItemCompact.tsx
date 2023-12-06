import React from 'react';

import { Lang } from 'src/features/language/Lang';
import classes from 'src/layout/Summary/SummaryItemCompact.module.css';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export interface ICompactSummaryItem {
  targetNode: LayoutNode;
  displayData: string;
}

export function SummaryItemCompact({ targetNode, displayData }: ICompactSummaryItem) {
  const textBindings = 'textResourceBindings' in targetNode.item ? targetNode.item.textResourceBindings : undefined;
  const summaryTitleTrb = textBindings && 'summaryTitle' in textBindings ? textBindings.summaryTitle : undefined;
  const titleTrb = textBindings && 'title' in textBindings ? textBindings.title : undefined;

  return (
    <div data-testid={'summary-item-compact'}>
      {(summaryTitleTrb ?? titleTrb) && (
        <span>
          <Lang
            id={summaryTitleTrb ?? titleTrb}
            node={targetNode}
          />
          {' : '}
        </span>
      )}
      {displayData ? (
        <span className={classes.data}>{displayData}</span>
      ) : (
        <span className={classes.emptyField}>
          <Lang
            id={'general.empty_summary'}
            node={targetNode}
          />
        </span>
      )}
    </div>
  );
}
