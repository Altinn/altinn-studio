import React from 'react';

import { useComponentBinding, useRequiredValidation, useTextResource } from 'nextsrc/libs/form-client/react/hooks';
import { getDateConstraint } from 'nextsrc/libs/form-engine/components/Datepicker/dateConstraints';
import { useLabelProps } from 'nextsrc/libs/form-engine/components/useLabelProps';
import { ComponentValidations } from 'nextsrc/libs/form-engine/ComponentValidations';
import type { ComponentProps } from 'nextsrc/libs/form-engine/components/index';

import { Flex } from 'src/app-components/Flex/Flex';
import { Label } from 'src/app-components/Label/Label';
import type { CompDatepickerExternal } from 'src/layout/Datepicker/config.generated';

export const Datepicker = ({ component, parentBinding, itemIndex }: ComponentProps) => {
  const props = component as CompDatepickerExternal;
  const {
    field: simpleBindingField,
    value,
    setValue,
  } = useComponentBinding(props.dataModelBindings?.simpleBinding, parentBinding, itemIndex);
  const titleKey = typeof props.textResourceBindings?.title === 'string' ? props.textResourceBindings.title : undefined;
  const title = useTextResource(titleKey);
  const required = useRequiredValidation(props.required, simpleBindingField, value, title);
  const { help, description, requiredIndicator } = useLabelProps(props.textResourceBindings);

  const minDate = getDateConstraint(props.minDate as string | undefined, 'min');
  const maxDate = getDateConstraint(props.maxDate as string | undefined, 'max');

  // Normalize stored value to yyyy-MM-dd for the native input
  const rawValue = String(value ?? '');
  const dateValue = rawValue.length >= 10 ? rawValue.slice(0, 10) : rawValue;

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
      <Flex
        item
        size={{ xs: 12 }}
      >
        <input
          id={props.id}
          type='date'
          required={required}
          readOnly={props.readOnly as boolean | undefined}
          value={dateValue}
          min={minDate}
          max={maxDate}
          onChange={(e) => setValue(e.target.value)}
        />
        <ComponentValidations bindingPath={simpleBindingField} />
      </Flex>
    </Label>
  );
};
