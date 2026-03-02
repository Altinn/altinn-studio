import React from 'react';

import { Checkbox } from '@digdir/designsystemet-react';

import cn from 'classnames';

import { Fieldset } from 'src/app-components/Label/Fieldset';
import { useBoundValue, useRequiredValidation, useTextResource } from 'nextsrc/libs/form-client/react/hooks';
import { extractField } from 'nextsrc/libs/form-client/resolveBindings';
import { ComponentValidations } from 'nextsrc/libs/form-engine/ComponentValidations';
import classes from 'nextsrc/libs/form-engine/components/Checkboxes/Checkboxes.module.css';
import { useOptions } from 'nextsrc/libs/form-engine/components/useOptions';
import { useLabelProps } from 'nextsrc/libs/form-engine/components/useLabelProps';
import type { ComponentProps } from 'nextsrc/libs/form-engine/components/index';
import type { CompCheckboxesExternal } from 'src/layout/Checkboxes/config.generated';

export const Checkboxes = ({ component, parentBinding, itemIndex }: ComponentProps) => {
  const props = component as unknown as CompCheckboxesExternal;
  const simpleBinding = extractField(props.dataModelBindings?.simpleBinding);
  const { value, setValue } = useBoundValue(simpleBinding, parentBinding, itemIndex);
  const titleKey = typeof props.textResourceBindings?.title === 'string' ? props.textResourceBindings.title : undefined;
  const title = useTextResource(titleKey);
  const required = useRequiredValidation(props.required, simpleBinding, value, title);
  const options = useOptions(props);
  const { help, description, requiredIndicator } = useLabelProps(props.textResourceBindings);
  const isHorizontal = props.layout === 'row';

  const selected = String(value ?? '')
    .split(',')
    .filter(Boolean);

  const toggle = (optionValue: string) => {
    const next = selected.includes(optionValue) ? selected.filter((v) => v !== optionValue) : [...selected, optionValue];
    setValue(next.join(','));
  };

  return (
    <Fieldset
      legend={title}
      required={required}
      requiredIndicator={requiredIndicator}
      help={help}
      description={description}
      grid={props.grid?.labelGrid}
    >
      <div className={cn({ [classes.horizontal]: isHorizontal })}>
        {options.map((opt) => (
          <Checkbox
            key={String(opt.value)}
            label={opt.label}
            value={String(opt.value)}
            checked={selected.includes(String(opt.value))}
            onChange={() => toggle(String(opt.value))}
          />
        ))}
      </div>
      <ComponentValidations bindingPath={simpleBinding} />
    </Fieldset>
  );
};
