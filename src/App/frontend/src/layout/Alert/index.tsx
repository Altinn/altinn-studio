import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { AlertComponent } from 'src/layout/Alert/AlertComponent';
import { AlertDef } from 'src/layout/Alert/config.def.generated';
import type { PropsFromGenericComponent } from 'src/layout';

export class Alert extends AlertDef {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'Alert'>>(
    function LayoutComponentAlertRender(props, _): JSX.Element | null {
      return <AlertComponent {...props} />;
    },
  );
}
