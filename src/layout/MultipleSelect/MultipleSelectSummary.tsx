import React from 'react';

import { useDisplayData } from 'src/features/displayData/useDisplayData';
import { Lang } from 'src/features/language/Lang';
import { MultipleValueSummary } from 'src/layout/Summary2/CommonSummaryComponents/MultipleValueSummary';
import { useSummaryOverrides, useSummaryProp } from 'src/layout/Summary2/summaryStoreContext';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export function MultipleSelectSummary({ target }: Summary2Props<'MultipleSelect'>) {
  const overrides = useSummaryOverrides(target);
  const isCompact = useSummaryProp('isCompact');
  const displayData = useDisplayData(target);

  const maxStringLength = 75;

  const showAsList =
    overrides?.displayType === 'list' || (!overrides?.displayType && displayData?.length >= maxStringLength);
  const title = useNodeItem(target, (i) => i.textResourceBindings?.title);

  return (
    <MultipleValueSummary
      title={
        <Lang
          id={title}
          node={target}
        />
      }
      componentNode={target}
      showAsList={showAsList}
      isCompact={isCompact}
      emptyFieldText={overrides?.emptyFieldText}
    />
  );
}
