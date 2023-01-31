import React from 'react';

import { ComponentType } from 'src/layout';
import { LayoutComponent } from 'src/layout/LayoutComponent';
import { NavigationButtonsComponent } from 'src/layout/NavigationButtons/NavigationButtonsComponent';
import type { PropsFromGenericComponent } from 'src/layout';

export class NavigationButtons extends LayoutComponent<'NavigationButtons'> {
  render(props: PropsFromGenericComponent<'NavigationButtons'>): JSX.Element | null {
    return <NavigationButtonsComponent {...props} />;
  }

  renderWithLabel(): boolean {
    return false;
  }

  getComponentType(): ComponentType {
    return ComponentType.Button;
  }
}
