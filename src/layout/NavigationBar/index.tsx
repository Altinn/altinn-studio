import React from 'react';

import { LayoutComponent } from 'src/layout/LayoutComponent';
import { NavigationBarComponent } from 'src/layout/NavigationBar/NavigationBarComponent';
import type { PropsFromGenericComponent } from 'src/layout';

export class NavigationBar extends LayoutComponent<'NavigationBar'> {
  render(props: PropsFromGenericComponent<'NavigationBar'>): JSX.Element | null {
    return <NavigationBarComponent {...props} />;
  }

  renderWithLabel(): boolean {
    return false;
  }
}
