import React from 'react';

import type { PropsFromGenericComponent } from '..';

import { ActionComponent } from 'src/layout/LayoutComponent';
import { PrintButtonComponent } from 'src/layout/PrintButton/PrintButtonComponent';

export class PrintButton extends ActionComponent<'PrintButton'> {
  render(props: PropsFromGenericComponent<'PrintButton'>): JSX.Element | null {
    return <PrintButtonComponent {...props} />;
  }

  canRenderInButtonGroup(): boolean {
    return true;
  }

  renderWithLabel(): boolean {
    return false;
  }
}
