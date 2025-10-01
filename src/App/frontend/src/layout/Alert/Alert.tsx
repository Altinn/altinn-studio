import React from 'react';

import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { AlertBaseComponent } from 'src/layout/Alert/AlertBaseComponent';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { useExternalItem } from 'src/utils/layout/hooks';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';

export const Alert = ({ baseComponentId }: PropsFromGenericComponent<'Alert'>) => {
  const { severity, textResourceBindings } = useItemWhenType(baseComponentId, 'Alert');
  const { langAsString } = useLanguage();

  // If the 'hidden' property is an expression, we should alert screen readers whenever this becomes visible
  const component = useExternalItem(baseComponentId);
  const shouldAlertScreenReaders = Array.isArray(component?.hidden);

  return (
    <ComponentStructureWrapper baseComponentId={baseComponentId}>
      <AlertBaseComponent
        severity={severity}
        useAsAlert={shouldAlertScreenReaders}
        title={textResourceBindings?.title && langAsString(textResourceBindings.title)}
      >
        {textResourceBindings?.body && <Lang id={textResourceBindings.body} />}
      </AlertBaseComponent>
    </ComponentStructureWrapper>
  );
};
