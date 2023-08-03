import React from 'react';

import { useLanguage } from 'src/hooks/useLanguage';
import { AlertBaseComponent } from 'src/layout/Alert/AlertBaseComponent';
import type { PropsFromGenericComponent } from 'src/layout';

export type AlertProps = PropsFromGenericComponent<'Alert'>;

export const Alert = ({ node }: AlertProps) => {
  const { severity, textResourceBindings, hidden } = node.item;
  const { langAsString } = useLanguage();

  const title = textResourceBindings?.title && langAsString(textResourceBindings.title);
  const body = textResourceBindings?.body && langAsString(textResourceBindings.body);
  const shouldAlertScreenReaders = hidden === false;

  return (
    <AlertBaseComponent
      severity={severity}
      useAsAlert={shouldAlertScreenReaders}
      title={title}
    >
      {body}
    </AlertBaseComponent>
  );
};
