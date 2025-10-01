import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { NavigationButtonsDef } from 'src/layout/NavigationButtons/config.def.generated';
import { NavigationButtonsComponent } from 'src/layout/NavigationButtons/NavigationButtonsComponent';
import type { PropsFromGenericComponent } from 'src/layout';

export class NavigationButtons extends NavigationButtonsDef {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'NavigationButtons'>>(
    function LayoutComponentNavigationButtonRender(props, _): JSX.Element | null {
      return <NavigationButtonsComponent {...props} />;
    },
  );
}
