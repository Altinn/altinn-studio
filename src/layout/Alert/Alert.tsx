import React from 'react';

import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { AlertBaseComponent } from 'src/layout/Alert/AlertBaseComponent';
import { ComponentStructureWrapper } from 'src/layout/ComponentStructureWrapper';
import type { PropsFromGenericComponent } from 'src/layout';

export type AlertProps = PropsFromGenericComponent<'Alert'>;

export const Alert = ({ node }: AlertProps) => {
  const { severity, textResourceBindings, hidden } = node.item;
  const { langAsString } = useLanguage();

  const shouldAlertScreenReaders = hidden === false;

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
