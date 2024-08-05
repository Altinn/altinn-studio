import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { ActionButtonComponent } from 'src/layout/ActionButton/ActionButtonComponent';
import { ActionButtonDef } from 'src/layout/ActionButton/config.def.generated';
import type { PropsFromGenericComponent } from 'src/layout';

export class ActionButton extends ActionButtonDef {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'ActionButton'>>(
    function LayoutComponentActionButtonRender(props, _): JSX.Element | null {
      return <ActionButtonComponent {...props} />;
    },
  );
}
