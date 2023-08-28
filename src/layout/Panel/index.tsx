import React from 'react';

import { PanelDef } from 'src/layout/Panel/config.def.generated';
import { PanelComponent } from 'src/layout/Panel/PanelComponent';
import type { PropsFromGenericComponent } from 'src/layout';

export class Panel extends PanelDef {
  render(props: PropsFromGenericComponent<'Panel'>): JSX.Element | null {
    return <PanelComponent {...props} />;
  }
}
