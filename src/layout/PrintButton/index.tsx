import React from 'react';

import { ComponentType } from 'src/layout';
import { LayoutComponent } from 'src/layout/LayoutComponent';
import { PrintButtonComponent } from 'src/layout/PrintButton/PrintButtonComponent';

export class PrintButton extends LayoutComponent<'PrintButton'> {
  render(): JSX.Element | null {
    return <PrintButtonComponent />;
  }

  getComponentType(): ComponentType {
    return ComponentType.Button;
  }
}
