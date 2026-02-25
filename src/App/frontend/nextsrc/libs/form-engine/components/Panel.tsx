import React from 'react';

import { useTextResource } from 'nextsrc/libs/form-client/react/hooks';

import type { ComponentProps } from 'nextsrc/libs/form-engine/components/index';
import type { CompPanelExternal } from 'src/layout/Panel/config.generated';

export const Panel = ({ component }: ComponentProps) => {
  const props = component as CompPanelExternal;
  const titleKey = typeof props.textResourceBindings?.title === 'string' ? props.textResourceBindings.title : undefined;
  const bodyKey = typeof props.textResourceBindings?.body === 'string' ? props.textResourceBindings.body : undefined;
  const title = useTextResource(titleKey);
  const body = useTextResource(bodyKey);

  return (
    <div style={{ border: '1px solid #ccc', padding: '1rem', borderRadius: '4px' }}>
      {title && <strong>{title}</strong>}
      {body && <p>{body}</p>}
    </div>
  );
};
