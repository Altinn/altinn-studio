import React from 'react';

import { Alert as DsAlert } from '@digdir/designsystemet-react';
import { useTextResource } from 'nextsrc/libs/form-client/react/hooks';

import type { ComponentProps } from 'nextsrc/libs/form-engine/components/index';
import type { CompAlertExternal } from 'src/layout/Alert/config.generated';

const severityToColor: Record<string, 'info' | 'warning' | 'danger' | 'success'> = {
  info: 'info',
  warning: 'warning',
  danger: 'danger',
  success: 'success',
};

export const Alert = ({ component }: ComponentProps) => {
  const props = component as CompAlertExternal;
  const titleKey = typeof props.textResourceBindings?.title === 'string' ? props.textResourceBindings.title : undefined;
  const bodyKey = typeof props.textResourceBindings?.body === 'string' ? props.textResourceBindings.body : undefined;
  const title = useTextResource(titleKey);
  const body = useTextResource(bodyKey);
  const color = severityToColor[props.severity] ?? 'info';

  return (
    <DsAlert data-color={color}>
      {title && <strong>{title}</strong>}
      {body && <p>{body}</p>}
    </DsAlert>
  );
};
