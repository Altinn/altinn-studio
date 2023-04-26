import React from 'react';

import { ActionComponent } from 'src/layout/LayoutComponent';
import { NavigationButtonsComponent } from 'src/layout/NavigationButtons/NavigationButtonsComponent';
import type { PropsFromGenericComponent } from 'src/layout';

export class NavigationButtons extends ActionComponent<'NavigationButtons'> {
  render(props: PropsFromGenericComponent<'NavigationButtons'>): JSX.Element | null {
    return <NavigationButtonsComponent {...props} />;
  }

  renderWithLabel(): boolean {
    return false;
  }

  canRenderInTable(): boolean {
    return false;
  }
}
