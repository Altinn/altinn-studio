import React from 'react';

import { renderComponent } from 'nextsrc/features/FormEngine/layout-components';
import type { FormDataNode } from 'nextsrc/core/api-client/data.api';
import type { ResolvedCompExternal } from 'nextsrc/libs/form-client/moveChildren';

interface FormEngineProps {
  components: ResolvedCompExternal[];
  data: FormDataNode;
}

export const FormEngine = ({ components }: FormEngineProps) => (
  <div data-testid='AppHeader'>
    <div id='finishedLoading' />
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
