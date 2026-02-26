import React from 'react';

import { FormEngine } from 'nextsrc/libs/form-engine/FormEngine';
import { useGroupArray, usePushArrayItem } from 'nextsrc/libs/form-client/react/hooks';
import { extractField } from 'nextsrc/libs/form-client/resolveBindings';
import type { ComponentProps } from 'nextsrc/libs/form-engine/components/index';

import type { CompRepeatingGroupExternal } from 'src/layout/RepeatingGroup/config.generated';

export const RepeatingGroup = ({ component, parentBinding, itemIndex }: ComponentProps) => {
  const props = component as unknown as CompRepeatingGroupExternal;
  const groupField = extractField(props.dataModelBindings.group);
  const rows = useGroupArray(groupField, parentBinding, itemIndex);
  const pushItem = usePushArrayItem(groupField, parentBinding, itemIndex);

  // Resolve the full path for this group so nested children get the right parentBinding
  const resolvedGroupPath =
    parentBinding !== undefined && itemIndex !== undefined
      ? `${parentBinding}[${itemIndex}].${groupField.split('.').pop()}`
      : groupField;

  return (
    <div style={{ border: '1px solid blue' }}>
      {rows.map((_, idx) => (
        <div key={idx}>
          <FormEngine
            components={component.children ?? []}
            parentBinding={resolvedGroupPath}
            itemIndex={idx}
          />
        </div>
      ))}
      <button
        type='button'
        onClick={() => pushItem({})}
      >
        Add
      </button>
    </div>
  );
};
