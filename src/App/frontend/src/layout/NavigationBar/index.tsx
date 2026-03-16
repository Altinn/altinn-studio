import React, { forwardRef } from 'react';
import type { JSX } from 'react';

import { NavigationBarDef } from 'src/layout/NavigationBar/config.def.generated';
import { NavigationBarComponent } from 'src/layout/NavigationBar/NavigationBarComponent';
import type { PropsFromGenericComponent } from 'src/layout';

export class NavigationBar extends NavigationBarDef {
  render = forwardRef<HTMLElement, PropsFromGenericComponent<'NavigationBar'>>(
    function LayoutComponentNavigationBarRender(props, _): JSX.Element | null {
      return <NavigationBarComponent {...props} />;
    },
  );
}
