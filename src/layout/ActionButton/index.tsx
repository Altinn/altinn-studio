import React from 'react';

import { ActionButtonComponent } from 'src/layout/ActionButton/ActionButtonComponent';
import { ActionComponent } from 'src/layout/LayoutComponent';
import type { PropsFromGenericComponent } from 'src/layout';

export class ActionButton extends ActionComponent<'ActionButton'> {
  render(props: PropsFromGenericComponent<'ActionButton'>): JSX.Element | null {
    return <ActionButtonComponent {...props} />;
  }

  canRenderInButtonGroup(): boolean {
    return true;
  }

  renderWithLabel(): boolean {
    return false;
  }
}
