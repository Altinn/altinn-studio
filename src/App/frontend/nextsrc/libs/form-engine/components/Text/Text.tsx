import React from 'react';

import { useTextResource } from 'nextsrc/libs/form-client/react/hooks';
import { useLanguage } from 'nextsrc/libs/form-client/react/useLanguage';
import type { ComponentProps } from 'nextsrc/libs/form-engine/components/index';

import type { CompTextExternal } from 'src/layout/Text/config.generated';

export const Text = ({ component }: ComponentProps) => {
  const props = component as CompTextExternal;
  const { langAsString } = useLanguage();
  const titleKey = typeof props.textResourceBindings?.title === 'string' ? props.textResourceBindings.title : undefined;
  const title = useTextResource(titleKey);
  const value = typeof props.value === 'string' ? langAsString(props.value) : '';

  return (
    <div>
      {title && <label>{title}</label>}
      <span>{value}</span>
    </div>
  );
};
