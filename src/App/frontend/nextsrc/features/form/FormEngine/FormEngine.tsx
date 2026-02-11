import React from 'react';
import type { ReactElement } from 'react';

import { useFormValue } from 'nextsrc/packages/form-client/form-context';
import type { FormDataNode } from 'nextsrc/core/apiClient/dataApi';

import type { CompInputExternal } from 'src/layout/Input/config.generated';
import type { CompExternal, CompTypes } from 'src/layout/layout';

interface FormEngineProps {
  components: CompExternal[];
  data: FormDataNode;
}

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
    <input
      type='text'
      value={String(value ?? '')}
      onChange={(e) => setValue(e.target.value)}
    />
  );
};

const componentMap: Partial<Record<CompTypes, ComponentRender>> = {
  Input: InputComponent,
};

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
        return <li key={component.id}>Component not implement: {component.type}</li>;
      })}
    </ul>
  </div>
);
