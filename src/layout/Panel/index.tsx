import React from 'react';

import { PresentationComponent } from 'src/layout/LayoutComponent';
import { PanelComponent } from 'src/layout/Panel/PanelComponent';
import type { PropsFromGenericComponent } from 'src/layout';

export class Panel extends PresentationComponent<'Panel'> {
  render(props: PropsFromGenericComponent<'Panel'>): JSX.Element | null {
    return <PanelComponent {...props} />;
  }

  renderWithLabel(): boolean {
    return false;
  }

  canRenderInTable(): boolean {
    return false;
  }
}
