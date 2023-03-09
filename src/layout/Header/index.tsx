import React from 'react';

import { HeaderComponent } from 'src/layout/Header/HeaderComponent';
import { PresentationComponent } from 'src/layout/LayoutComponent';
import type { PropsFromGenericComponent } from 'src/layout';

export class Header extends PresentationComponent<'Header'> {
  render(props: PropsFromGenericComponent<'Header'>): JSX.Element | null {
    return <HeaderComponent {...props} />;
  }

  renderWithLabel(): boolean {
    return false;
  }
}
