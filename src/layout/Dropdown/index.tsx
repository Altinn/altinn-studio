import React from 'react';

import { DropdownComponent } from 'src/layout/Dropdown/DropdownComponent';
import { LayoutComponent } from 'src/layout/LayoutComponent';
import type { PropsFromGenericComponent } from 'src/layout';

export class Dropdown extends LayoutComponent<'Dropdown'> {
  render(props: PropsFromGenericComponent<'Dropdown'>): JSX.Element | null {
    return <DropdownComponent {...props} />;
  }
}
