import React from 'react';

import { useBoundValue } from 'nextsrc/libs/form-client/react/hooks';
import { extractField } from 'nextsrc/libs/form-client/resolveBindings';
import { ComponentValidations } from 'nextsrc/libs/form-engine/ComponentValidations';

import type { ComponentProps } from 'nextsrc/libs/form-engine/components/index';
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
      <ComponentValidations bindingPath={simpleBinding} />
    </div>
  );
};
