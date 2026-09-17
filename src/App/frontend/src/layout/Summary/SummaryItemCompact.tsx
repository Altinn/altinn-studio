import React from 'react';

import { CommonExpressions } from '@app/layout-contract/generated/expressions.generated';

import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import classes from 'src/layout/Summary/SummaryItemCompact.module.css';
import { useComponentConfig } from 'src/utils/layout/hooks';
import { useEvalOptionalText } from 'src/utils/layout/useEvalExpression';

export interface ICompactSummaryItem {
  targetBaseComponentId: string;
  displayData: string;
}

export function SummaryItemCompact({ targetBaseComponentId, displayData }: ICompactSummaryItem) {
  const config = useComponentConfig(targetBaseComponentId);
  const summaryTitle = useEvalOptionalText(
    config.textResourceBindings && 'summaryTitle' in config.textResourceBindings
      ? config.textResourceBindings.summaryTitle
      : undefined,
    CommonExpressions.TRBSummarizable.summaryTitle,
  );
  const title = useEvalOptionalText(
    config.textResourceBindings && 'title' in config.textResourceBindings
      ? config.textResourceBindings.title
      : undefined,
    CommonExpressions.TRBLabel.title,
  );

  return (
    <div data-testid='summary-item-compact'>
      {/* FIXME: is data-testid actually necessary? Can we get it in tests in other ways? */}
      <SummaryTitle title={summaryTitle ?? title} />
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
