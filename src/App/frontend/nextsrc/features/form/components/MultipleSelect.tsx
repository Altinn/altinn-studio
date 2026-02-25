import React from 'react';

import { useBoundValue, useTextResource } from 'nextsrc/libs/form-client/react/hooks';
import { extractField } from 'nextsrc/libs/form-client/resolveBindings';

import { useOptions } from 'nextsrc/features/form/components/useOptions';

import type { ComponentProps } from 'nextsrc/features/form/components/index';
import type { CompMultipleSelectExternal } from 'src/layout/MultipleSelect/config.generated';

export const MultipleSelect = ({ component, parentBinding, itemIndex }: ComponentProps) => {
  const props = component as unknown as CompMultipleSelectExternal;
  const simpleBinding = extractField(props.dataModelBindings?.simpleBinding);
  const { value, setValue } = useBoundValue(simpleBinding, parentBinding, itemIndex);
  const titleKey = typeof props.textResourceBindings?.title === 'string' ? props.textResourceBindings.title : undefined;
  const title = useTextResource(titleKey);
  const options = useOptions(props);

  const selected = String(value ?? '')
    .split(',')
    .filter(Boolean);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const values = Array.from(e.target.selectedOptions, (opt) => opt.value);
    setValue(values.join(','));
  };

  return (
    <div>
      {title && <label>{title}</label>}
      <select
        multiple
        value={selected}
        onChange={handleChange}
      >
        {options.map((opt) => (
          <option
            key={String(opt.value)}
            value={String(opt.value)}
          >
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
};
