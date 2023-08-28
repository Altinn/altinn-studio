import React from 'react';

import { NavigationBarDef } from 'src/layout/NavigationBar/config.def.generated';
import { NavigationBarComponent } from 'src/layout/NavigationBar/NavigationBarComponent';
import type { PropsFromGenericComponent } from 'src/layout';

export class NavigationBar extends NavigationBarDef {
  render(props: PropsFromGenericComponent<'NavigationBar'>): JSX.Element | null {
    return <NavigationBarComponent {...props} />;
  }
}
