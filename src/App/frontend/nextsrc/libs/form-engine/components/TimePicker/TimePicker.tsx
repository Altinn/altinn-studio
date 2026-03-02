import React from 'react';

import { Textfield } from '@digdir/designsystemet-react';

import { Flex } from 'src/app-components/Flex/Flex';
import { Label } from 'src/app-components/Label/Label';
import { useBoundValue, useRequiredValidation, useTextResource } from 'nextsrc/libs/form-client/react/hooks';
import { extractField } from 'nextsrc/libs/form-client/resolveBindings';
import { ComponentValidations } from 'nextsrc/libs/form-engine/ComponentValidations';
import { useLabelProps } from 'nextsrc/libs/form-engine/components/useLabelProps';
import type { ComponentProps } from 'nextsrc/libs/form-engine/components/index';

import type { CompTimePickerExternal } from 'src/layout/TimePicker/config.generated';

export const TimePicker = ({ component, parentBinding, itemIndex }: ComponentProps) => {
  const props = component as CompTimePickerExternal;
  const simpleBinding = extractField(props.dataModelBindings?.simpleBinding);
  const { value, setValue } = useBoundValue(simpleBinding, parentBinding, itemIndex);
  const titleKey = typeof props.textResourceBindings?.title === 'string' ? props.textResourceBindings.title : undefined;
  const title = useTextResource(titleKey);
  const required = useRequiredValidation(props.required, simpleBinding, value, title);
  const { help, description, requiredIndicator } = useLabelProps(props.textResourceBindings);

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
    <Label
      label={title}
      htmlFor={props.id}
      required={required}
      requiredIndicator={requiredIndicator}
      help={help}
      description={description}
      grid={props.grid?.labelGrid}
    >
      <Flex item size={{ xs: 12 }}>
        <Textfield
          label=''
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
      </Flex>
    </Label>
  );
};
