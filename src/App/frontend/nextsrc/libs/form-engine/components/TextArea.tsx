import React from 'react';

import { Textarea as DsTextarea } from '@digdir/designsystemet-react';
import { useBoundValue, useRequiredValidation, useTextResource } from 'nextsrc/libs/form-client/react/hooks';
import { extractField } from 'nextsrc/libs/form-client/resolveBindings';
import { ComponentValidations } from 'nextsrc/libs/form-engine/ComponentValidations';
import type { ComponentProps } from 'nextsrc/libs/form-engine/components/index';

import type { CompTextAreaExternal } from 'src/layout/TextArea/config.generated';

export const TextArea = ({ component, parentBinding, itemIndex }: ComponentProps) => {
  const props = component as CompTextAreaExternal;
  const simpleBinding = extractField(props.dataModelBindings?.simpleBinding);
  const { value, setValue } = useBoundValue(simpleBinding, parentBinding, itemIndex);
  const titleKey = typeof props.textResourceBindings?.title === 'string' ? props.textResourceBindings.title : undefined;
  const title = useTextResource(titleKey);
  const required = useRequiredValidation(props.required, simpleBinding, value, title);

  return (
    <div>
      {title && (
        <label>
          {title}
          {required && ' *'}
        </label>
      )}
      <DsTextarea
        required={required}
        value={String(value ?? '')}
        onChange={(e) => setValue(e.target.value)}
      />
      <ComponentValidations bindingPath={simpleBinding} />
    </div>
  );
};
