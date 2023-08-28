import React from 'react';

import { Alert as AlertComponent } from 'src/layout/Alert/Alert';
import { AlertDef } from 'src/layout/Alert/config.def.generated';
import type { PropsFromGenericComponent } from 'src/layout';

export class Alert extends AlertDef {
  render(props: PropsFromGenericComponent<'Alert'>): JSX.Element | null {
    return <AlertComponent {...props} />;
  }
}
