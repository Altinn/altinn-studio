import React from 'react';

import { useTextResource } from 'nextsrc/libs/form-client/react/hooks';

import type { ComponentProps } from 'nextsrc/libs/form-engine/components/index';
import type { CompNumberExternal } from 'src/layout/Number/config.generated';

export const Number = ({ component }: ComponentProps) => {
  const props = component as CompNumberExternal;
  const titleKey = typeof props.textResourceBindings?.title === 'string' ? props.textResourceBindings.title : undefined;
  const title = useTextResource(titleKey);
  const displayValue = typeof props.value === 'number' ? props.value : '';

  return (
    <div>
      {title && <span>{title}: </span>}
      <span>{displayValue}</span>
    </div>
  );
};
