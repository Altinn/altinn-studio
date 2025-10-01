import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { ButtonComponent } from 'src/layout/Button/ButtonComponent';
import { ButtonDef } from 'src/layout/Button/config.def.generated';
import type { PropsFromGenericComponent } from 'src/layout';

export class Button extends ButtonDef {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'Button'>>(
    function LayoutComponentButtonRender(props, _): JSX.Element | null {
      return <ButtonComponent {...props} />;
    },
  );
}
