import React from 'react';

import { Textfield } from '@digdir/designsystemet-react';

import { useBoundValue, useRequiredValidation, useTextResource } from 'nextsrc/libs/form-client/react/hooks';
import { extractField } from 'nextsrc/libs/form-client/resolveBindings';
import { ComponentValidations } from 'nextsrc/libs/form-engine/ComponentValidations';
import type { ComponentProps } from 'nextsrc/libs/form-engine/components/index';

import type { CompTimePickerExternal } from 'src/layout/TimePicker/config.generated';

export const TimePicker = ({ component, parentBinding, itemIndex }: ComponentProps) => {
  const props = component as CompTimePickerExternal;
  const simpleBinding = extractField(props.dataModelBindings?.simpleBinding);
  const { value, setValue } = useBoundValue(simpleBinding, parentBinding, itemIndex);
  const titleKey = typeof props.textResourceBindings?.title === 'string' ? props.textResourceBindings.title : undefined;
  const title = useTextResource(titleKey);
  const required = useRequiredValidation(props.required, simpleBinding, value, title);

  const descriptionKey =
    typeof props.textResourceBindings?.description === 'string' ? props.textResourceBindings.description : undefined;
  const description = useTextResource(descriptionKey);

  const format = props.format ?? 'HH:mm';
  const hasSeconds = format.includes('ss');
  const step = hasSeconds ? 1 : 60;

  const minTime = typeof props.minTime === 'string' ? props.minTime : undefined;
  const maxTime = typeof props.maxTime === 'string' ? props.maxTime : undefined;

  const formValue = String(value ?? '');

  if (!simpleBinding) {
    return (
      <Textfield
        label={title || ''}
        disabled
      />
    );
  }

  return (
    <div>
      <Textfield
        label={title || ''}
        description={description || undefined}
        id={props.id}
        type='time'
        step={step}
        min={minTime}
        max={maxTime}
        required={required}
        readOnly={props.readOnly as boolean | undefined}
        value={formValue}
        onChange={(e) => setValue(e.target.value)}
        autoComplete={props.autocomplete}
      />
      <ComponentValidations bindingPath={simpleBinding} />
    </div>
  );
};
