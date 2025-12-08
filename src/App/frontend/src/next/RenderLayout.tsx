import React from 'react';

import { RenderComponent } from 'src/next/RenderComponent';
import type { ILayoutFile } from 'src/layout/common.generated';

interface RenderLayoutType {
  layout: ILayoutFile;
}

export const RenderLayout: React.FunctionComponent<RenderLayoutType> = ({ layout }) => (
  <ul>
    {layout.data.layout.map((component) => (
      <RenderComponent
        key={component.id}
        component={component}
      />
    ))}
  </ul>
);
