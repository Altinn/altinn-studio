import React from 'react';

import { ButtonComponent } from 'src/layout/Button/ButtonComponent';
import { LayoutComponent } from 'src/layout/LayoutComponent';
import type { PropsFromGenericComponent } from 'src/layout';

export class Button extends LayoutComponent<'Button'> {
  render(props: PropsFromGenericComponent<'Button'>): JSX.Element | null {
    return <ButtonComponent {...props} />;
  }

  renderWithLabel(): boolean {
    return false;
  }
}
