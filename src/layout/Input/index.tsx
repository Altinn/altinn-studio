import React from 'react';

import { InputComponent } from 'src/layout/Input/InputComponent';
import { LayoutComponent } from 'src/layout/LayoutComponent';
import type { PropsFromGenericComponent } from 'src/layout';

export class Input extends LayoutComponent<'Input'> {
  render(props: PropsFromGenericComponent<'Input'>): JSX.Element | null {
    return <InputComponent {...props} />;
  }
}
