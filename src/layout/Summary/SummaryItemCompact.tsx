import React from 'react';

import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import classes from 'src/layout/Summary/SummaryItemCompact.module.css';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

export interface ICompactSummaryItem {
  targetNode: LayoutNode;
  displayData: string;
}

export function SummaryItemCompact({ targetNode, displayData }: ICompactSummaryItem) {
  const targetItem = useNodeItem(targetNode);
  const textBindings = 'textResourceBindings' in targetItem ? targetItem.textResourceBindings : undefined;
  const summaryTitleTrb =
    textBindings && 'summaryTitle' in textBindings ? (textBindings.summaryTitle as string) : undefined;
  const titleTrb = textBindings && 'title' in textBindings ? textBindings.title : undefined;

  return (
    <div data-testid='summary-item-compact'>
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
  const { langAsString } = useLanguage(targetNode);
  if (!title) {
    return null;
  }
  return <span>{`${langAsString(title).trim()} : `}</span>;
};

const DisplayData = ({ displayData, targetNode }: { displayData: string; targetNode: LayoutNode }) =>
  displayData ? (
    <span className={classes.data}>{displayData}</span>
  ) : (
    <span className={classes.emptyField}>
      <Lang
        id='general.empty_summary'
        node={targetNode}
      />
    </span>
  );
