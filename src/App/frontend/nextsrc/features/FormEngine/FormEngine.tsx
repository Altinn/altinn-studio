import React from 'react';

import { getLayoutComponent } from 'nextsrc/features/FormEngine/layoutComponents';
import type { FormDataNode } from 'nextsrc/core/apiClient/dataApi';
import type { ResolvedCompExternal } from 'nextsrc/libs/form-client/moveChildren';

function renderComponent(componentProps: ResolvedCompExternal) {
  return getLayoutComponent(componentProps);
}

interface FormEngineProps {
  components: ResolvedCompExternal[];
  data: FormDataNode;
}

export const FormEngine = ({ components }: FormEngineProps) => (
  <div>
    <ul>
      {components.map((componentProps) => {
        const rendered = renderComponent(componentProps);
        if (!rendered) {
          return (
            <li key={componentProps.id}>
              Component not implemented: {componentProps.type} ID: {componentProps.id}
            </li>
          );
        }

        return <li key={componentProps.id}>{rendered}</li>;
      })}
    </ul>
  </div>
);
