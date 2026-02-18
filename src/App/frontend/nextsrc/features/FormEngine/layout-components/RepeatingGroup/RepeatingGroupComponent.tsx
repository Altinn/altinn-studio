import React from 'react';

import { FormEngine } from 'nextsrc/features/FormEngine/FormEngine';
import { useFormValue } from 'nextsrc/libs/form-client/form-context';
import { extractField, resolveChildBindings } from 'nextsrc/libs/form-client/resolveBindings';
import type { Override } from 'nextsrc/features/FormEngine/types';
import type { ResolvedCompExternal } from 'nextsrc/libs/form-client/moveChildren';

import type { CompRepeatingGroupExternal } from 'src/layout/RepeatingGroup/config.generated';

type OverriddenRepeatingGroupWithChildComponents = Override<
  CompRepeatingGroupExternal,
  'children',
  ResolvedCompExternal[]
>;

export const RepeatingGroupNext = (props: OverriddenRepeatingGroupWithChildComponents) => {
  const groupField = extractField(props.dataModelBindings.group);
  const { value } = useFormValue(groupField);

  if (!Array.isArray(value)) {
    return <div />;
  }

  return (
    <div style={{ border: '1px solid blue' }}>
      {value.map((_, idx) => (
        <FormEngine
          key={idx}
          components={resolveChildBindings(props.children, groupField, idx)}
          data={value}
        />
      ))}
    </div>
  );
};

export function isRepeatingGroup(props: ResolvedCompExternal): props is OverriddenRepeatingGroupWithChildComponents {
  return props.type === 'RepeatingGroup' && Array.isArray(props.children);
}
