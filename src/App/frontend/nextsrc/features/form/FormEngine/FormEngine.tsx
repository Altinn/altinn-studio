import React from 'react';
import type { ReactElement } from 'react';

import { useFormValue } from 'nextsrc/libs/form-client/form-context';
import type { FormDataNode } from 'nextsrc/core/apiClient/dataApi';
import type { ResolvedCompExternal } from 'nextsrc/libs/form-client/moveChildren';

import type { CompInputExternal } from 'src/layout/Input/config.generated';
import type { CompExternal, CompTypes } from 'src/layout/layout';
import type { CompRepeatingGroupExternal } from 'src/layout/RepeatingGroup/config.generated';

type ComponentRender = (props: any) => ReactElement;

const InputComponent = (props: CompInputExternal) => {
  const path = String(props.dataModelBindings?.simpleBinding ?? '');
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

const RepeatingGroup = (props: OverriddenRepeatingGroupWithChildComponents) => {
  const path = String(props.dataModelBindings.group ?? '');
  const { value, setValue } = useFormValue(path);
  console.log({ value, setValue });

  return (
    <div style={{ border: '1px solid blue' }}>
      Hei jeg er en repeterende gruppe
      {props.children.map((component) => {
        const Comp = componentMap[component.type];
        if (Comp) {
          return (
            <div
              key={component.id}
              style={{ border: '1px solid pink' }}
            >
              <Comp {...component} />
            </div>
          );
        }
        return (
          <li key={component.id}>
            Component not implement: {component.type} ID: {component.id}
          </li>
        );
      })}
    </div>
  );
};

const componentMap: Partial<Record<CompTypes, ComponentRender>> = {
  Input: InputComponent,
  RepeatingGroup,
};

interface FormEngineProps {
  components: CompExternal[];
  data: FormDataNode;
}

export const FormEngine = ({ components }: FormEngineProps) => (
  <div>
    <h1>Welcome to FormEngine</h1>
    <ul>
      {components.map((component) => {
        const Comp = componentMap[component.type];
        if (Comp) {
          return (
            <li key={component.id}>
              <Comp {...component} />
            </li>
          );
        }
        return (
          <li key={component.id}>
            Component not implement: {component.type} ID: {component.id}
          </li>
        );
      })}
    </ul>
  </div>
);
