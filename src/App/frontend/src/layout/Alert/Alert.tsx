import React from 'react';

import { Alert as AlertLayout } from '@app/form-component';

import { useExternalItem } from 'src/utils/layout/hooks';
import { useComponentStructureData } from 'src/utils/layout/useComponentStructureData';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';

export const Alert = ({ baseComponentId }: PropsFromGenericComponent<'Alert'>) => {
  const { severity, textResourceBindings } = useItemWhenType(baseComponentId, 'Alert');
  const { componentId, innerGrid } = useComponentStructureData(baseComponentId);

  // If the 'hidden' property is an expression, we should alert screen readers whenever this becomes visible
  const component = useExternalItem(baseComponentId);
  const shouldAlertScreenReaders = Array.isArray(component?.hidden);

  return (
    <AlertLayout
      componentId={componentId}
      severity={severity}
      title={textResourceBindings?.title}
      body={textResourceBindings?.body}
      useAsAlert={shouldAlertScreenReaders}
      innerGrid={innerGrid}
    />
  );
};
