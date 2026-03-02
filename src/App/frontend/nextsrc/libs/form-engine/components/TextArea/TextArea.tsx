import React from 'react';

import { Textfield } from '@digdir/designsystemet-react';
import { useBoundValue, useRequiredValidation, useTextResource } from 'nextsrc/libs/form-client/react/hooks';
import { extractField } from 'nextsrc/libs/form-client/resolveBindings';
import { ComponentValidations } from 'nextsrc/libs/form-engine/ComponentValidations';
import type { ComponentProps } from 'nextsrc/libs/form-engine/components';

import type { CompTextAreaExternal } from 'src/layout/TextArea/config.generated';

export const TextArea = ({ component, parentBinding, itemIndex }: ComponentProps) => {
  const props = component as CompTextAreaExternal;
  const simpleBinding = extractField(props.dataModelBindings?.simpleBinding);
  const { value, setValue } = useBoundValue(simpleBinding, parentBinding, itemIndex);
  const titleKey = typeof props.textResourceBindings?.title === 'string' ? props.textResourceBindings.title : undefined;
  const title = useTextResource(titleKey);
  const required = useRequiredValidation(props.required, simpleBinding, value, title);

  const descriptionKey =
    typeof props.textResourceBindings?.description === 'string' ? props.textResourceBindings.description : undefined;
  const description = useTextResource(descriptionKey);

  return (
    <div>
      <Textfield
        multiline
        label={title || ''}
        description={description || undefined}
        required={required}
        readOnly={props.readOnly as boolean | undefined}
        value={String(value ?? '')}
        onChange={(e) => setValue(e.target.value)}
        autoComplete={props.autocomplete}
        counter={props.maxLength ?? undefined}
      />
      <ComponentValidations bindingPath={simpleBinding} />
    </div>
  );
};
