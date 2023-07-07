import React from 'react';

import { useLanguage } from 'src/hooks/useLanguage';
import classes from 'src/layout/Summary/SummaryItemCompact.module.css';
import type { ITextResourceBindings } from 'src/layout/layout';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export interface ICompactSummaryItem {
  targetNode: LayoutNode;
  displayData: string;
}

export function SummaryItemCompact({ targetNode, displayData }: ICompactSummaryItem) {
  const { lang } = useLanguage();
  const textBindings = targetNode.item.textResourceBindings as ITextResourceBindings;
  const title = lang(textBindings?.summaryTitle ?? textBindings?.title);
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
