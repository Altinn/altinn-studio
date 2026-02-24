import React from 'react';

import { useFormValue } from 'nextsrc/libs/form-client/react/hooks';
import { extractField } from 'nextsrc/libs/form-client/resolveBindings';

import type { ComponentProps } from 'nextsrc/features/form/components/index';
import type { CompInputExternal } from 'src/layout/Input/config.generated';

export const Input = ({ component }: ComponentProps) => {
  const props = component as CompInputExternal;
  const path = extractField(props.dataModelBindings?.simpleBinding);
  const { value, setValue } = useFormValue(path);

  if (!path) {
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
