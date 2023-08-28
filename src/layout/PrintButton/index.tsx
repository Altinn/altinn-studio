import React from 'react';

import type { PropsFromGenericComponent } from '..';

import { PrintButtonDef } from 'src/layout/PrintButton/config.def.generated';
import { PrintButtonComponent } from 'src/layout/PrintButton/PrintButtonComponent';

export class PrintButton extends PrintButtonDef {
  render(props: PropsFromGenericComponent<'PrintButton'>): JSX.Element | null {
    return <PrintButtonComponent {...props} />;
  }
}
