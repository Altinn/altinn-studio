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
      {/* FIXME: is data-testid actually necessary? Can we get it in tests in other ways? */}
      <SummaryTitle
        title={summaryTitleTrb ?? titleTrb}
        targetNode={targetNode}
      />
      <DisplayData
        displayData={displayData}
        targetNode={targetNode}
      />
    </div>
  );
}

const SummaryTitle = ({ title, targetNode }: { title: string | undefined; targetNode: LayoutNode }) => {
  if (!title) {
    return null;
  }
  return (
    <span>
      <Lang
        id={title}
        node={targetNode}
      />
      {' : '}
    </span>
  );
};

const DisplayData = ({ displayData, targetNode }: { displayData: string; targetNode: LayoutNode }) =>
  displayData ? (
    <span className={classes.data}>{displayData}</span>
  ) : (
    <span className={classes.emptyField}>
      <Lang
        id={'general.empty_summary'}
        node={targetNode}
      />
    </span>
  );
