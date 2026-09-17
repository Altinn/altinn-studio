import React from 'react';

import { PrintButton } from '@app/form-component';
import { Expressions } from '@app/layout-contract/generated/expressions.generated';

import type { PropsFromGenericComponent } from '..';

import { useComponentConfig } from 'src/utils/layout/hooks';
import { useComponentStructureData } from 'src/utils/layout/useComponentStructureData';
import { useEvalExpression } from 'src/utils/layout/useEvalExpression';

export const PrintButtonComponent = ({ baseComponentId }: PropsFromGenericComponent<'PrintButton'>) => {
  const config = useComponentConfig(baseComponentId, 'PrintButton');
  const title = useEvalExpression(
    config.textResourceBindings?.title,
    Expressions.PrintButton.textResourceBindings.title,
  );

  const { componentId, innerGrid } = useComponentStructureData(baseComponentId);
  return (
    <PrintButton
      componentId={componentId}
      title={config.textResourceBindings?.title === undefined ? undefined : title}
      onClick={() => window.print()}
      innerGrid={innerGrid}
    />
  );
};
