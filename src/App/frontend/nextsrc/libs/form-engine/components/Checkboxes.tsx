import React from 'react';

import { Checkbox, Fieldset } from '@digdir/designsystemet-react';
import { useBoundValue, useTextResource } from 'nextsrc/libs/form-client/react/hooks';
import { extractField } from 'nextsrc/libs/form-client/resolveBindings';
import { ComponentValidations } from 'nextsrc/libs/form-engine/ComponentValidations';

import { useOptions } from 'nextsrc/libs/form-engine/components/useOptions';

import type { ComponentProps } from 'nextsrc/libs/form-engine/components/index';
import type { CompCheckboxesExternal } from 'src/layout/Checkboxes/config.generated';

export const Checkboxes = ({ component, parentBinding, itemIndex }: ComponentProps) => {
  const props = component as unknown as CompCheckboxesExternal;
  const simpleBinding = extractField(props.dataModelBindings?.simpleBinding);
  const { value, setValue } = useBoundValue(simpleBinding, parentBinding, itemIndex);
  const titleKey = typeof props.textResourceBindings?.title === 'string' ? props.textResourceBindings.title : undefined;
  const title = useTextResource(titleKey);
  const options = useOptions(props);

  const selected = String(value ?? '')
    .split(',')
    .filter(Boolean);

  const toggle = (optionValue: string) => {
    const next = selected.includes(optionValue) ? selected.filter((v) => v !== optionValue) : [...selected, optionValue];
    setValue(next.join(','));
  };

  return (
    <Fieldset>
      {title && <legend>{title}</legend>}
      {options.map((opt) => (
        <Checkbox
          key={String(opt.value)}
          label={opt.label}
          value={String(opt.value)}
          checked={selected.includes(String(opt.value))}
          onChange={() => toggle(String(opt.value))}
        />
      ))}
      <ComponentValidations bindingPath={simpleBinding} />
    </Fieldset>
  );
};
