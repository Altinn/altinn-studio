import React from 'react';

import { LayoutComponent } from 'src/layout/LayoutComponent';
import { PanelComponent } from 'src/layout/Panel/PanelComponent';
import type { PropsFromGenericComponent } from 'src/layout';

export class Panel extends LayoutComponent<'Panel'> {
  render(props: PropsFromGenericComponent<'Panel'>): JSX.Element | null {
    return <PanelComponent {...props} />;
  }

  renderWithLabel(): boolean {
    return false;
  }
}
