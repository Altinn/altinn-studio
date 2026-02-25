import React from 'react';

import { useBoundValue, useTextResource } from 'nextsrc/libs/form-client/react/hooks';
import { extractField } from 'nextsrc/libs/form-client/resolveBindings';

import type { ComponentProps } from 'nextsrc/libs/form-engine/components/index';
import type { CompDatepickerExternal } from 'src/layout/Datepicker/config.generated';

export const Datepicker = ({ component, parentBinding, itemIndex }: ComponentProps) => {
  const props = component as CompDatepickerExternal;
  const simpleBinding = extractField(props.dataModelBindings?.simpleBinding);
  const { value, setValue } = useBoundValue(simpleBinding, parentBinding, itemIndex);
  const titleKey = typeof props.textResourceBindings?.title === 'string' ? props.textResourceBindings.title : undefined;
  const title = useTextResource(titleKey);

  return (
    <div>
      {title && <label>{title}</label>}
      <input
        type='date'
        value={String(value ?? '')}
        onChange={(e) => setValue(e.target.value)}
      />
    </div>
  );
};
