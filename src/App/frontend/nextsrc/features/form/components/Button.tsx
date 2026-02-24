import React from 'react';

import { Button as DsButton } from '@digdir/designsystemet-react';
import { useTextResource } from 'nextsrc/libs/form-client/react/hooks';

import type { ComponentProps } from 'nextsrc/features/form/components/index';
import type { CompButtonExternal } from 'src/layout/Button/config.generated';

export const Button = ({ component }: ComponentProps) => {
  const props = component as CompButtonExternal;
  const titleKey = typeof props.textResourceBindings?.title === 'string' ? props.textResourceBindings.title : undefined;
  const title = useTextResource(titleKey);

  return <DsButton>{title}</DsButton>;
};
