import React from 'react';

import { Select } from '@digdir/designsystemet-react';
import { useBoundValue, useTextResource } from 'nextsrc/libs/form-client/react/hooks';
import { extractField } from 'nextsrc/libs/form-client/resolveBindings';
import { ComponentValidations } from 'nextsrc/libs/form-engine/ComponentValidations';

import { useOptions } from 'nextsrc/libs/form-engine/components/useOptions';

import type { ComponentProps } from 'nextsrc/libs/form-engine/components/index';
import type { CompDropdownExternal } from 'src/layout/Dropdown/config.generated';

export const Dropdown = ({ component, parentBinding, itemIndex }: ComponentProps) => {
  const props = component as unknown as CompDropdownExternal;
  const simpleBinding = extractField(props.dataModelBindings?.simpleBinding);
  const { value, setValue } = useBoundValue(simpleBinding, parentBinding, itemIndex);
  const titleKey = typeof props.textResourceBindings?.title === 'string' ? props.textResourceBindings.title : undefined;
  const title = useTextResource(titleKey);
  const options = useOptions(props);

  return (
    <div>
      {title && <label>{title}</label>}
      <Select
        value={String(value ?? '')}
        onChange={(e) => setValue(e.target.value)}
      >
        <option value='' />
        {options.map((opt) => (
          <option
            key={String(opt.value)}
            value={String(opt.value)}
          >
            {opt.label}
          </option>
        ))}
      </Select>
      <ComponentValidations bindingPath={simpleBinding} />
    </div>
  );
};
