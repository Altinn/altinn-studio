import React from 'react';

import { useDisplayData } from 'src/features/displayData/useDisplayData';
import { OptionComponent } from 'src/layout/Option/OptionComponent';
import { SummaryContains, SummaryFlex } from 'src/layout/Summary2/SummaryComponent2/ComponentSummary';
import { useSummaryOverrides } from 'src/layout/Summary2/summaryStoreContext';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export const OptionSummary = ({ targetBaseComponentId }: Summary2Props) => {
  const emptyFieldText = useSummaryOverrides(targetBaseComponentId)?.emptyFieldText;
  const displayData = useDisplayData(targetBaseComponentId);

  return (
    <SummaryFlex
      targetBaseId={targetBaseComponentId}
      content={displayData ? SummaryContains.SomeUserContent : SummaryContains.EmptyValueNotRequired}
    >
      <OptionComponent
        baseComponentId={targetBaseComponentId}
        isSummary
        emptyFieldText={emptyFieldText}
      />
    </SummaryFlex>
  );
};
