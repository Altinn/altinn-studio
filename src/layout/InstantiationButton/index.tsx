import React from 'react';

import { InstantiationButtonComponent } from 'src/layout/InstantiationButton/InstantiationButtonComponent';
import { ActionComponent } from 'src/layout/LayoutComponent';
import type { PropsFromGenericComponent } from 'src/layout';

export class InstantiationButton extends ActionComponent<'InstantiationButton'> {
  render(props: PropsFromGenericComponent<'InstantiationButton'>): JSX.Element | null {
    return <InstantiationButtonComponent {...props} />;
  }

  renderWithLabel(): boolean {
    return false;
  }
}
