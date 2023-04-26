import React from 'react';

import { InstanceInformationComponent } from 'src/layout/InstanceInformation/InstanceInformationComponent';
import { PresentationComponent } from 'src/layout/LayoutComponent';
import type { PropsFromGenericComponent } from 'src/layout';

export class InstanceInformation extends PresentationComponent<'InstanceInformation'> {
  render(props: PropsFromGenericComponent<'InstanceInformation'>): JSX.Element | null {
    return <InstanceInformationComponent {...props} />;
  }

  canRenderInTable(): boolean {
    return false;
  }
}
