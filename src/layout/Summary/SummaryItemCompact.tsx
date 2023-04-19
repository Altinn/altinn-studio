import React from 'react';

import { useAppSelector } from 'src/hooks/useAppSelector';
import { getLanguageFromKey } from 'src/language/sharedLanguage';
import classes from 'src/layout/Summary/SummaryItemCompact.module.css';
import { getTextFromAppOrDefault } from 'src/utils/textResource';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export interface ICompactSummaryItem {
  targetNode: LayoutNode;
  displayData: string;
}

export function SummaryItemCompact({ targetNode, displayData }: ICompactSummaryItem) {
  const language = useAppSelector((state) => state.language.language);
  const textResources = useAppSelector((state) => state.textResources.resources);
  const textBindings = targetNode.item.textResourceBindings;

  return (
    <div data-testid={'summary-item-compact'}>
      {textBindings?.title && (
        <span>
          {getTextFromAppOrDefault(textBindings.title, textResources, {}, [], false)}
          {' : '}
        </span>
      )}
      {displayData ? (
        <span className={classes.data}>{displayData}</span>
      ) : (
        <span className={classes.emptyField}>{getLanguageFromKey('general.empty_summary', language || {})}</span>
      )}
    </div>
  );
}
