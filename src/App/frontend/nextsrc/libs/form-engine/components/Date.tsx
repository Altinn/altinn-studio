import React from 'react';

import { parseISO, format as formatDate, isValid } from 'date-fns';
import { useTextResource } from 'nextsrc/libs/form-client/react/hooks';
import type { ComponentProps } from 'nextsrc/libs/form-engine/components/index';

import type { CompDateExternal } from 'src/layout/Date/config.generated';

export const Date = ({ component }: ComponentProps) => {
  const props = component as CompDateExternal;
  const titleKey = typeof props.textResourceBindings?.title === 'string' ? props.textResourceBindings.title : undefined;
  const title = useTextResource(titleKey);

  const rawValue = typeof props.value === 'string' ? props.value : '';
  let displayValue = rawValue;

  if (rawValue) {
    const parsed = parseISO(rawValue);
    if (isValid(parsed)) {
      displayValue = props.format ? formatDate(parsed, props.format) : parsed.toLocaleDateString();
    }
  }

  return (
    <div>
      {title && <label>{title}</label>}
      <span>{displayValue}</span>
    </div>
  );
};
