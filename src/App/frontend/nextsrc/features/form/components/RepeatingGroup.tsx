import React from 'react';

import { useFormValue } from 'nextsrc/libs/form-client/react/hooks';
import { extractField, resolveChildBindings } from 'nextsrc/libs/form-client/resolveBindings';

import type { ComponentProps } from 'nextsrc/features/form/components/index';
import type { CompRepeatingGroupExternal } from 'src/layout/RepeatingGroup/config.generated';

export const RepeatingGroup = ({ component, renderChildren }: ComponentProps) => {
  const props = component as unknown as CompRepeatingGroupExternal;
  const groupField = extractField(props.dataModelBindings.group);
  const { value } = useFormValue(groupField);

  if (!Array.isArray(value)) {
    return <div />;
  }

  return (
    <div style={{ border: '1px solid blue' }}>
      {value.map((_, idx) => (
        <div key={idx}>{renderChildren(resolveChildBindings(component.children ?? [], groupField, idx))}</div>
      ))}
    </div>
  );
};
