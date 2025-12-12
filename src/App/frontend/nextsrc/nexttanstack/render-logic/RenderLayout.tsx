import React from 'react';

import { ComponentSwitch } from 'nextsrc/nexttanstack/render-logic/ComponentSwitch';
import { moveChildren } from 'nextsrc/nexttanstack/utils/moveChildren';

import type { ILayoutFile } from 'src/layout/common.generated';

interface RenderLayoutType {
  layout: ILayoutFile;
}

export const RenderLayout: React.FunctionComponent<RenderLayoutType> = ({ layout }) => {
  const resolvedLayout = moveChildren(layout);
  // console.log('resolvedLayout', resolvedLayout);
  // debugger;
  return (
    <ul>
      {layout.data.layout.map((component) => (
        <ComponentSwitch
          key={component.id}
          component={component}
        />
      ))}
    </ul>
  );
};
