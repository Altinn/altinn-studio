import React from 'react';

import { NavigationButtonsDef } from 'src/layout/NavigationButtons/config.def.generated';
import { NavigationButtonsComponent } from 'src/layout/NavigationButtons/NavigationButtonsComponent';
import type { PropsFromGenericComponent } from 'src/layout';

export class NavigationButtons extends NavigationButtonsDef {
  render(props: PropsFromGenericComponent<'NavigationButtons'>): JSX.Element | null {
    return <NavigationButtonsComponent {...props} />;
  }
}
