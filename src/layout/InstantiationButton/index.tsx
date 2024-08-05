import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { InstantiationButtonDef } from 'src/layout/InstantiationButton/config.def.generated';
import { InstantiationButtonComponent } from 'src/layout/InstantiationButton/InstantiationButtonComponent';
import type { PropsFromGenericComponent } from 'src/layout';

export class InstantiationButton extends InstantiationButtonDef {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'InstantiationButton'>>(
    function LayoutComponentInstantiationButtonRender(props, _): JSX.Element | null {
      return <InstantiationButtonComponent {...props} />;
    },
  );
}
