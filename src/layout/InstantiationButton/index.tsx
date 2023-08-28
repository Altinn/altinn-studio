import React from 'react';

import { InstantiationButtonDef } from 'src/layout/InstantiationButton/config.def.generated';
import { InstantiationButtonComponent } from 'src/layout/InstantiationButton/InstantiationButtonComponent';
import type { PropsFromGenericComponent } from 'src/layout';

export class InstantiationButton extends InstantiationButtonDef {
  render(props: PropsFromGenericComponent<'InstantiationButton'>): JSX.Element | null {
    return <InstantiationButtonComponent {...props} />;
  }
}
