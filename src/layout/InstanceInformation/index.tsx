import React from 'react';

import { InstanceInformationDef } from 'src/layout/InstanceInformation/config.def.generated';
import { InstanceInformationComponent } from 'src/layout/InstanceInformation/InstanceInformationComponent';
import type { PropsFromGenericComponent } from 'src/layout';

export class InstanceInformation extends InstanceInformationDef {
  render(props: PropsFromGenericComponent<'InstanceInformation'>): JSX.Element | null {
    return <InstanceInformationComponent {...props} />;
  }
}
