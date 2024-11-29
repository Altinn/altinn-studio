import React from 'react';

import { Lang } from 'src/features/language/Lang';
import { useUnifiedValidationsForNode } from 'src/features/validation/selectors/unifiedValidationsForNode';
import { validationsOfSeverity } from 'src/features/validation/utils';
import { SingleValueSummary } from 'src/layout/Summary2/CommonSummaryComponents/SingleValueSummary';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { LayoutNode } from 'src/utils/layout/LayoutNode';

type NumberComponentSummaryProps = {
  componentNode: LayoutNode<'Number'>;
  isCompact?: boolean;
  emptyFieldText?: string;
};

export const NumberSummary = ({ componentNode, isCompact, emptyFieldText }: NumberComponentSummaryProps) => {
  const displayData = componentNode.def.useDisplayData(componentNode);
  const validations = useUnifiedValidationsForNode(componentNode);
  const errors = validationsOfSeverity(validations, 'error');
  const title = useNodeItem(componentNode, (i) => i.textResourceBindings?.title);
  const direction = useNodeItem(componentNode, (i) => i.direction);

  const compact = (direction === 'horizontal' && isCompact == undefined) || isCompact;

  return (
    <SingleValueSummary
      title={
        title && (
          <Lang
            id={title}
            node={componentNode}
          />
        )
      }
      displayData={displayData}
      errors={errors}
      componentNode={componentNode}
      hideEditButton
      isCompact={compact}
      emptyFieldText={emptyFieldText}
    />
  );
};
