import React from 'react';

import { Fieldset, Radio } from '@digdir/designsystemet-react';
import { useBoundValue, useTextResource } from 'nextsrc/libs/form-client/react/hooks';
import { extractField } from 'nextsrc/libs/form-client/resolveBindings';
import { ComponentValidations } from 'nextsrc/libs/form-engine/ComponentValidations';

import { useOptions } from 'nextsrc/libs/form-engine/components/useOptions';

import type { ComponentProps } from 'nextsrc/libs/form-engine/components/index';
import type { CompRadioButtonsExternal } from 'src/layout/RadioButtons/config.generated';

export const RadioButtons = ({ component, parentBinding, itemIndex }: ComponentProps) => {
  const props = component as unknown as CompRadioButtonsExternal;
  const simpleBinding = extractField(props.dataModelBindings?.simpleBinding);
  const { value, setValue } = useBoundValue(simpleBinding, parentBinding, itemIndex);
  const titleKey = typeof props.textResourceBindings?.title === 'string' ? props.textResourceBindings.title : undefined;
  const title = useTextResource(titleKey);
  const options = useOptions(props);

  return (
    <Fieldset>
      {title && <legend>{title}</legend>}
      {options.map((opt) => (
        <Radio
          key={String(opt.value)}
          label={opt.label}
          value={String(opt.value)}
          checked={String(value ?? '') === String(opt.value)}
          onChange={() => setValue(String(opt.value))}
        />
      ))}
      <ComponentValidations bindingPath={simpleBinding} />
    </Fieldset>
  );
};
