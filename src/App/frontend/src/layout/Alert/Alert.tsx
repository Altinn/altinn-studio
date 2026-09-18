import React from 'react';

import { Alert as AlertLayout } from '@app/form-component';
import { Expressions } from '@app/layout-contract/generated/expressions.generated';

import { useComponentConfig } from 'src/utils/layout/hooks';
import { useComponentStructureData } from 'src/utils/layout/useComponentStructureData';
import { useEvalExpression } from 'src/utils/layout/useEvalExpression';
import type { PropsFromGenericComponent } from 'src/layout';

export const Alert = ({ baseComponentId }: PropsFromGenericComponent<'Alert'>) => {
  const config = useComponentConfig(baseComponentId, 'Alert');
  const title = useEvalExpression(config.textResourceBindings?.title, Expressions.Alert.textResourceBindings.title);
  const body = useEvalExpression(config.textResourceBindings?.body, Expressions.Alert.textResourceBindings.body);

  const { componentId, innerGrid } = useComponentStructureData(baseComponentId);
  // If the 'hidden' property is an expression, we should alert screen readers whenever this becomes visible
  const component = useComponentConfig(baseComponentId);
  const shouldAlertScreenReaders = Array.isArray(component?.hidden);
  return (
    <AlertLayout
      componentId={componentId}
      severity={config.severity}
      title={config.textResourceBindings?.title === undefined ? undefined : title}
      body={config.textResourceBindings?.body === undefined ? undefined : body}
      useAsAlert={shouldAlertScreenReaders}
      innerGrid={innerGrid}
    />
  );
};
