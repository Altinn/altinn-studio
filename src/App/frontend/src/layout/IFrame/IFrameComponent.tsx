import React from 'react';
import type { JSX } from 'react';

import { IFrame as IFrameLayout } from '@app/form-component';
import { Expressions } from '@app/layout-contract/generated/expressions.generated';

import { useComponentConfig } from 'src/utils/layout/hooks';
import { useComponentStructureData } from 'src/utils/layout/useComponentStructureData';
import { useEvalExpression } from 'src/utils/layout/useEvalExpression';
import type { PropsFromGenericComponent } from 'src/layout';

export const IFrameComponent = ({ baseComponentId }: PropsFromGenericComponent<'IFrame'>): JSX.Element => {
  const config = useComponentConfig(baseComponentId, 'IFrame');
  const title = useEvalExpression(config.textResourceBindings?.title, Expressions.IFrame.textResourceBindings.title);

  const { componentId, innerGrid } = useComponentStructureData(baseComponentId);
  return (
    <IFrameLayout
      componentId={componentId}
      title={config.textResourceBindings?.title === undefined ? undefined : title}
      sandbox={config.sandbox}
      innerGrid={innerGrid}
    />
  );
};
