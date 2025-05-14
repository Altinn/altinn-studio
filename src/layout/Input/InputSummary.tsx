import React from 'react';

import { useDisplayData } from 'src/features/displayData/useDisplayData';
import { Lang } from 'src/features/language/Lang';
import { useUnifiedValidationsForNode } from 'src/features/validation/selectors/unifiedValidationsForNode';
import { validationsOfSeverity } from 'src/features/validation/utils';
import { SingleValueSummary } from 'src/layout/Summary2/CommonSummaryComponents/SingleValueSummary';
import { useSummaryOverrides, useSummaryProp } from 'src/layout/Summary2/summaryStoreContext';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { Summary2Props } from 'src/layout/Summary2/SummaryComponent2/types';

export const InputSummary = ({ target }: Summary2Props<'Input'>) => {
  const emptyFieldText = useSummaryOverrides(target)?.emptyFieldText;
  const isCompact = useSummaryProp('isCompact');
  const displayData = useDisplayData(target);
  const validations = useUnifiedValidationsForNode(target);
  const errors = validationsOfSeverity(validations, 'error');
  const title = useNodeItem(target, (i) => i.textResourceBindings?.title);

  return (
    <SingleValueSummary
      title={
        title && (
          <Lang
            id={title}
            node={target}
          />
        )
      }
      displayData={displayData}
      errors={errors}
      componentNode={target}
      isCompact={isCompact}
      emptyFieldText={emptyFieldText}
    />
  );
};
