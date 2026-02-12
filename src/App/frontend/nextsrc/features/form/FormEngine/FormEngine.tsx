import React from 'react';
import type { ReactElement } from 'react';

import { useFormValue } from 'nextsrc/libs/form-client/form-context';
import { extractField, resolveChildBindings } from 'nextsrc/libs/form-client/resolveBindings';
import type { FormDataNode } from 'nextsrc/core/apiClient/dataApi';
import type { ResolvedCompExternal } from 'nextsrc/libs/form-client/moveChildren';

import type { CompInputExternal } from 'src/layout/Input/config.generated';
import type { CompTypes } from 'src/layout/layout';
import type { CompRepeatingGroupExternal } from 'src/layout/RepeatingGroup/config.generated';

type ComponentRender = (props: any) => ReactElement;

const InputComponent = (props: CompInputExternal) => {
  const path = extractField(props.dataModelBindings?.simpleBinding);
  const { value, setValue } = useFormValue(path);

  if (!path) {
    return (
      <input
        type='text'
        disabled
      />
    );
  }

  return (
    <div>
      <input
        type='text'
        value={String(value ?? '')}
        onChange={(e) => setValue(e.target.value)}
      />
    </div>
  );
};

type Override<T, K extends keyof T, NewType> = Omit<T, K> & {
  [P in K]: NewType;
};

type OverriddenRepeatingGroupWithChildComponents = Override<
  CompRepeatingGroupExternal,
  'children',
  ResolvedCompExternal[]
>;

const RepeatingGroupNext = (props: OverriddenRepeatingGroupWithChildComponents) => {
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

const componentMap: Partial<Record<CompTypes, ComponentRender>> = {
  Input: InputComponent,
  RepeatingGroup: RepeatingGroupNext,
};

interface FormEngineProps {
  components: ResolvedCompExternal[];
  data: FormDataNode;
}

export const FormEngine = ({ components }: FormEngineProps) => (
  <div>
    <ul>
      {components.map((componentProps) => {
        const Comp = componentMap[componentProps.type];
        if (!Comp) {
          return (
            <li key={componentProps.id}>
              Component not implement: {componentProps.type} ID: {componentProps.id}
            </li>
          );
        }

        return (
          <li key={componentProps.id}>
            <Comp {...componentProps} />
          </li>
        );
      })}
    </ul>
  </div>
);
