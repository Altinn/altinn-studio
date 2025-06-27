import React from 'react';

import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { AlertBaseComponent } from 'src/layout/Alert/AlertBaseComponent';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { useExternalItem } from 'src/utils/layout/hooks';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';

export type AlertProps = PropsFromGenericComponent<'Alert'>;

export const Alert = ({ node }: AlertProps) => {
  const { severity, textResourceBindings } = useNodeItem(node);
  const { langAsString } = useLanguage();

  // If the 'hidden' property is an expression, we should alert screen readers whenever this becomes visible
  const component = useExternalItem(node.baseId);
  const shouldAlertScreenReaders = Array.isArray(component?.hidden);

  return (
    <ComponentStructureWrapper node={node}>
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
