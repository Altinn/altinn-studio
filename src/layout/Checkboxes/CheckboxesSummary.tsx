import React from 'react';

import { useDisplayData } from 'src/features/displayData/useDisplayData';
import { Lang } from 'src/features/language/Lang';
import {
  MultipleValueSummary,
  useMultipleValuesForSummary,
} from 'src/layout/Summary2/CommonSummaryComponents/MultipleValueSummary';
import { SummaryContains, SummaryFlex } from 'src/layout/Summary2/SummaryComponent2/ComponentSummary';
import { useSummaryOverrides, useSummaryProp } from 'src/layout/Summary2/summaryStoreContext';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export function CheckboxesSummary({ target }: Summary2Props<'Checkboxes'>) {
  const componentNode = target;
  const summaryOverride = useSummaryOverrides(componentNode);
  const emptyFieldText = summaryOverride?.emptyFieldText;
  const isCompact = useSummaryProp('isCompact');
  const displayData = useDisplayData(componentNode);
  const maxStringLength = 75;
  const showAsList =
    summaryOverride?.displayType === 'list' ||
    (!summaryOverride?.displayType && displayData?.length >= maxStringLength);
  const item = useItemWhenType(componentNode.baseId, 'Checkboxes');
  const title = item.textResourceBindings?.title;
  const required = item.required;
  const displayValues = useMultipleValuesForSummary(target);

  return (
    <SummaryFlex
      target={target}
      content={
        displayValues.length === 0
          ? required
            ? SummaryContains.EmptyValueRequired
            : SummaryContains.EmptyValueNotRequired
          : SummaryContains.SomeUserContent
      }
    >
      <MultipleValueSummary
        title={<Lang id={title} />}
        componentNode={componentNode}
        displayValues={displayValues}
        isCompact={isCompact}
        showAsList={showAsList}
        emptyFieldText={emptyFieldText}
      />
    </SummaryFlex>
  );
}
