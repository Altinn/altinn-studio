import React from 'react';

import { useComponentBinding, useTextResource } from 'nextsrc/libs/form-client/react/hooks';
import { useOptions } from 'nextsrc/libs/form-engine/components/useOptions';
import type { ComponentProps } from 'nextsrc/libs/form-engine/components/index';

import type { CompMultipleSelectExternal } from 'src/layout/MultipleSelect/config.generated';

export const MultipleSelect = ({ component, parentBinding, itemIndex }: ComponentProps) => {
  const props = component as unknown as CompMultipleSelectExternal;
  const { value, setValue } = useComponentBinding(props.dataModelBindings?.simpleBinding, parentBinding, itemIndex);
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
