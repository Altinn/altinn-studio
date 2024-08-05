import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { InstanceInformationDef } from 'src/layout/InstanceInformation/config.def.generated';
import { InstanceInformationComponent } from 'src/layout/InstanceInformation/InstanceInformationComponent';
import type { PropsFromGenericComponent } from 'src/layout';

export class InstanceInformation extends InstanceInformationDef {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'InstanceInformation'>>(
    function LayoutComponentInstanceInformationRender(props, _): JSX.Element | null {
      return <InstanceInformationComponent {...props} />;
    },
  );
}
