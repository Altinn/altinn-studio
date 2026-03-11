import React from 'react';

import { Radio } from '@digdir/designsystemet-react';
import cn from 'classnames';
import { useComponentBinding, useRequiredValidation, useTextResource } from 'nextsrc/libs/form-client/react/hooks';
import classes from 'nextsrc/libs/form-engine/components/RadioButtons/RadioButtons.module.css';
import { useLabelProps } from 'nextsrc/libs/form-engine/components/useLabelProps';
import { useOptions } from 'nextsrc/libs/form-engine/components/useOptions';
import { ComponentValidations } from 'nextsrc/libs/form-engine/ComponentValidations';
import type { ComponentProps } from 'nextsrc/libs/form-engine/components/index';

import { Fieldset } from 'src/app-components/Label/Fieldset';
import type { CompRadioButtonsExternal } from 'src/layout/RadioButtons/config.generated';

export const RadioButtons = ({ component, parentBinding, itemIndex }: ComponentProps) => {
  const props = component as unknown as CompRadioButtonsExternal;
  const {
    field: simpleBindingField,
    value,
    setValue,
  } = useComponentBinding(props.dataModelBindings?.simpleBinding, parentBinding, itemIndex);
  const titleKey = typeof props.textResourceBindings?.title === 'string' ? props.textResourceBindings.title : undefined;
  const title = useTextResource(titleKey);
  const required = useRequiredValidation(props.required, simpleBindingField, value, title);
  const options = useOptions(props);
  const { help, description, requiredIndicator } = useLabelProps(props.textResourceBindings);
  const isHorizontal = props.layout === 'row';

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
          <Radio
            key={String(opt.value)}
            label={opt.label}
            value={String(opt.value)}
            checked={String(value ?? '') === String(opt.value)}
            onChange={() => setValue(String(opt.value))}
          />
        ))}
      </div>
      <ComponentValidations bindingPath={simpleBindingField} />
    </Fieldset>
  );
};
