import React from 'react';

import { ActionComponent } from 'src/layout/LayoutComponent';
import { NavigationBarComponent } from 'src/layout/NavigationBar/NavigationBarComponent';
import type { PropsFromGenericComponent } from 'src/layout';

export class NavigationBar extends ActionComponent<'NavigationBar'> {
  render(props: PropsFromGenericComponent<'NavigationBar'>): JSX.Element | null {
    return <NavigationBarComponent {...props} />;
  }

  renderWithLabel(): boolean {
    return false;
  }
}
