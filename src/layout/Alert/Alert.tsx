import React from 'react';

import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { AlertBaseComponent } from 'src/layout/Alert/AlertBaseComponent';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import { NodesInternal } from 'src/utils/layout/NodesContext';
import { useNodeItem } from 'src/utils/layout/useNodeItem';
import type { PropsFromGenericComponent } from 'src/layout';

export type AlertProps = PropsFromGenericComponent<'Alert'>;

export const Alert = ({ node }: AlertProps) => {
  const { severity, textResourceBindings } = useNodeItem(node);
  const { langAsString } = useLanguage();

  // If the 'hidden' property is an expression, we should alert screen readers whenever this becomes visible
  const shouldAlertScreenReaders = NodesInternal.useNodeData(node, (d) => Array.isArray(d.layout.hidden));

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
