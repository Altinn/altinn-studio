import React from 'react';

import { useBoundValue, useRequiredValidation, useTextResource } from 'nextsrc/libs/form-client/react/hooks';
import { extractField } from 'nextsrc/libs/form-client/resolveBindings';
import { ComponentValidations } from 'nextsrc/libs/form-engine/ComponentValidations';
import { getDateConstraint } from 'nextsrc/libs/form-engine/components/Datepicker/dateConstraints';
import type { ComponentProps } from 'nextsrc/libs/form-engine/components/index';

import type { CompDatepickerExternal } from 'src/layout/Datepicker/config.generated';

export const Datepicker = ({ component, parentBinding, itemIndex }: ComponentProps) => {
  const props = component as CompDatepickerExternal;
  const simpleBinding = extractField(props.dataModelBindings?.simpleBinding);
  const { value, setValue } = useBoundValue(simpleBinding, parentBinding, itemIndex);
  const titleKey = typeof props.textResourceBindings?.title === 'string' ? props.textResourceBindings.title : undefined;
  const title = useTextResource(titleKey);
  const required = useRequiredValidation(props.required, simpleBinding, value, title);

  const minDate = getDateConstraint(props.minDate as string | undefined, 'min');
  const maxDate = getDateConstraint(props.maxDate as string | undefined, 'max');

  // Normalize stored value to yyyy-MM-dd for the native input
  const rawValue = String(value ?? '');
  const dateValue = rawValue.length >= 10 ? rawValue.slice(0, 10) : rawValue;

  return (
    <div>
      {title && (
        <label>
          {title}
          {required && ' *'}
        </label>
      )}
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
      <ComponentValidations bindingPath={simpleBinding} />
    </div>
  );
};
