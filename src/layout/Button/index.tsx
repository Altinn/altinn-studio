import React from 'react';

import { ButtonComponent } from 'src/layout/Button/ButtonComponent';
import { ButtonDef } from 'src/layout/Button/config.def.generated';
import type { PropsFromGenericComponent } from 'src/layout';

export class Button extends ButtonDef {
  render(props: PropsFromGenericComponent<'Button'>): JSX.Element | null {
    return <ButtonComponent {...props} />;
  }
}
