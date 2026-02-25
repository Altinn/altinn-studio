import React from 'react';

import { Textarea as DsTextarea } from '@digdir/designsystemet-react';
import { useBoundValue, useTextResource } from 'nextsrc/libs/form-client/react/hooks';
import { extractField } from 'nextsrc/libs/form-client/resolveBindings';

import type { ComponentProps } from 'nextsrc/libs/form-engine/components/index';
import type { CompTextAreaExternal } from 'src/layout/TextArea/config.generated';

export const TextArea = ({ component, parentBinding, itemIndex }: ComponentProps) => {
  const props = component as CompTextAreaExternal;
  const simpleBinding = extractField(props.dataModelBindings?.simpleBinding);
  const { value, setValue } = useBoundValue(simpleBinding, parentBinding, itemIndex);
  const titleKey = typeof props.textResourceBindings?.title === 'string' ? props.textResourceBindings.title : undefined;
  const title = useTextResource(titleKey);

  return (
    <div>
      {title && <label>{title}</label>}
      <DsTextarea
        value={String(value ?? '')}
        onChange={(e) => setValue(e.target.value)}
      />
    </div>
  );
};
