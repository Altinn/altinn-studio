import React from 'react';

import { PrintButton } from '@app/form-component';
import { Expressions } from '@app/layout-contract/generated/expressions.generated';

import type { PropsFromGenericComponent } from '..';

import { useComponentConfig } from 'src/utils/layout/hooks';
import { useComponentStructureData } from 'src/utils/layout/useComponentStructureData';
import { useEvalOptionalText } from 'src/utils/layout/useEvalExpression';

export const PrintButtonComponent = ({ baseComponentId }: PropsFromGenericComponent<'PrintButton'>) => {
  const config = useComponentConfig(baseComponentId, 'PrintButton');
  const title = useEvalOptionalText(
    config.textResourceBindings?.title,
    Expressions.PrintButton.textResourceBindings.title,
  );

  const { componentId, innerGrid } = useComponentStructureData(baseComponentId);
  return (
    <PrintButton
      componentId={componentId}
      title={title}
      onClick={() => window.print()}
      innerGrid={innerGrid}
    />
  );
};
