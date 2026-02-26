import React from 'react';

import { Button } from '@digdir/designsystemet-react';
import { useTextResource } from 'nextsrc/libs/form-client/react/hooks';
import type { ComponentProps } from 'nextsrc/libs/form-engine/components/index';

import type { CompPrintButtonExternal } from 'src/layout/PrintButton/config.generated';

export const PrintButton = ({ component }: ComponentProps) => {
  const props = component as CompPrintButtonExternal;
  const titleKey = typeof props.textResourceBindings?.title === 'string' ? props.textResourceBindings.title : undefined;
  const title = useTextResource(titleKey);

  return (
    <Button
      variant='secondary'
      onClick={() => window.print()}
    >
      {title || 'Print'}
    </Button>
  );
};
