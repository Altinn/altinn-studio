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

export function MultipleSelectSummary({ targetBaseComponentId }: Summary2Props) {
  const overrides = useSummaryOverrides<'MultipleSelect'>(targetBaseComponentId);
  const isCompact = useSummaryProp('isCompact');
  const displayData = useDisplayData(targetBaseComponentId);

  const maxStringLength = 75;

  const showAsList =
    overrides?.displayType === 'list' || (!overrides?.displayType && displayData?.length >= maxStringLength);
  const { textResourceBindings, required } = useItemWhenType(targetBaseComponentId, 'MultipleSelect');
  const displayValues = useMultipleValuesForSummary(targetBaseComponentId);

  return (
    <SummaryFlex
      targetBaseId={targetBaseComponentId}
      content={
        displayValues.length === 0
          ? required
            ? SummaryContains.EmptyValueRequired
            : SummaryContains.EmptyValueNotRequired
          : SummaryContains.SomeUserContent
      }
    >
      <MultipleValueSummary
        title={<Lang id={textResourceBindings?.title} />}
        baseComponentId={targetBaseComponentId}
        displayValues={displayValues}
        showAsList={showAsList}
        isCompact={isCompact}
        emptyFieldText={overrides?.emptyFieldText}
      />
    </SummaryFlex>
  );
}
