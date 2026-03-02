import React from 'react';

import { useFormValue } from 'nextsrc/libs/form-client/form-context';
import { extractField } from 'nextsrc/libs/form-client/resolveBindings';

import type { CompInputExternal } from 'src/layout/Input/config.generated';

export function InputComponent(props: CompInputExternal) {
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
}
