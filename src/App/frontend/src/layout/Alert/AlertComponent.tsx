import React from 'react';

import { Alert } from '@app/form-component';

import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { useExternalItem } from 'src/utils/layout/hooks';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';

export function AlertComponent({ baseComponentId }: PropsFromGenericComponent<'Alert'>) {
  const { severity, textResourceBindings } = useItemWhenType(baseComponentId, 'Alert');

  // If the 'hidden' property is an expression, we should alert screen readers whenever this becomes visible
  const component = useExternalItem(baseComponentId);
  const shouldAlertScreenReaders = Array.isArray(component?.hidden);

  return (
    <ComponentStructureWrapper baseComponentId={baseComponentId}>
      <Alert
        severity={severity}
        useAsAlert={shouldAlertScreenReaders}
        title={textResourceBindings?.title}
        body={textResourceBindings?.body}
      />
    </ComponentStructureWrapper>
  );
}
