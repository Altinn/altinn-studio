import React from 'react';

import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import classes from 'src/layout/Summary/SummaryItemCompact.module.css';
import { useItemFor } from 'src/utils/layout/useNodeItem';

export interface ICompactSummaryItem {
  targetBaseComponentId: string;
  displayData: string;
}

export function SummaryItemCompact({ targetBaseComponentId, displayData }: ICompactSummaryItem) {
  const targetItem = useItemFor(targetBaseComponentId);
  const textBindings = 'textResourceBindings' in targetItem ? targetItem.textResourceBindings : undefined;
  const summaryTitleTrb =
    textBindings && 'summaryTitle' in textBindings ? (textBindings.summaryTitle as string) : undefined;
  const titleTrb = textBindings && 'title' in textBindings ? textBindings.title : undefined;

  return (
    <div data-testid='summary-item-compact'>
      {/* FIXME: is data-testid actually necessary? Can we get it in tests in other ways? */}
      <SummaryTitle title={summaryTitleTrb ?? titleTrb} />
      <DisplayData displayData={displayData} />
    </div>
  );
}

const SummaryTitle = ({ title }: { title: string | undefined }) => {
  const { langAsString } = useLanguage();
  if (!title) {
    return null;
  }
  return <span>{`${langAsString(title).trim()} : `}</span>;
};

const DisplayData = ({ displayData }: { displayData: string }) =>
  displayData ? (
    <span className={classes.data}>{displayData}</span>
  ) : (
    <span className={classes.emptyField}>
      <Lang id='general.empty_summary' />
    </span>
  );
