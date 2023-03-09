import React from 'react';

import { ActionComponent } from 'src/layout/LayoutComponent';
import { PrintButtonComponent } from 'src/layout/PrintButton/PrintButtonComponent';

export class PrintButton extends ActionComponent<'PrintButton'> {
  render(): JSX.Element | null {
    return <PrintButtonComponent />;
  }
}
