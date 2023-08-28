import React from 'react';

import { ActionButtonComponent } from 'src/layout/ActionButton/ActionButtonComponent';
import { ActionButtonDef } from 'src/layout/ActionButton/config.def.generated';
import type { PropsFromGenericComponent } from 'src/layout';

export class ActionButton extends ActionButtonDef {
  render(props: PropsFromGenericComponent<'ActionButton'>): JSX.Element | null {
    return <ActionButtonComponent {...props} />;
  }
}
