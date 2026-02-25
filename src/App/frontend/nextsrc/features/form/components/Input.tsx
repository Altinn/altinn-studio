import React from 'react';

import { useBoundValue } from 'nextsrc/libs/form-client/react/hooks';
import { extractField } from 'nextsrc/libs/form-client/resolveBindings';

import type { ComponentProps } from 'nextsrc/features/form/components/index';
import type { CompInputExternal } from 'src/layout/Input/config.generated';

export const Input = ({ component, parentBinding, itemIndex }: ComponentProps) => {
  const props = component as CompInputExternal;
  const simpleBinding = extractField(props.dataModelBindings?.simpleBinding);
  const { value, setValue } = useBoundValue(simpleBinding, parentBinding, itemIndex);

  if (!simpleBinding) {
    return (
      <input
        type='text'
        disabled
      />
    );
  }

  return (
    <div>
      <input
        type='text'
        value={String(value ?? '')}
        onChange={(e) => setValue(e.target.value)}
      />
    </div>
  );
};
