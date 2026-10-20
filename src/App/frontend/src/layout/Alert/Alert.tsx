import React from 'react';

import { Alert as AlertLayout } from '@app/form-component';
import { Expressions } from '@app/layout-contract/generated/expressions.generated';

import { useComponentConfig } from 'src/utils/layout/hooks';
import { useComponentStructureData } from 'src/utils/layout/useComponentStructureData';
import { useEvalOptionalText } from 'src/utils/layout/useEvalExpression';
import type { PropsFromGenericComponent } from 'src/layout';

export const Alert = ({ baseComponentId }: PropsFromGenericComponent<'Alert'>) => {
  const config = useComponentConfig(baseComponentId, 'Alert');
  const title = useEvalOptionalText(config.textResourceBindings?.title, Expressions.Alert.textResourceBindings.title);
  const body = useEvalOptionalText(config.textResourceBindings?.body, Expressions.Alert.textResourceBindings.body);

  const { componentId, innerGrid } = useComponentStructureData(baseComponentId);
  // If the 'hidden' property is an expression, we should alert screen readers whenever this becomes visible
  const component = useComponentConfig(baseComponentId);
  const shouldAlertScreenReaders = Array.isArray(component?.hidden);
  return (
    <AlertLayout
      componentId={componentId}
      severity={config.severity}
      title={title}
      body={body}
      useAsAlert={shouldAlertScreenReaders}
      innerGrid={innerGrid}
    />
  );
};
