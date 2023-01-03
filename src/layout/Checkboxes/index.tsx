import React from 'react';

import { CheckboxContainerComponent } from 'src/layout/Checkboxes/CheckboxesContainerComponent';
import { LayoutComponent } from 'src/layout/LayoutComponent';
import type { PropsFromGenericComponent } from 'src/layout';

export class Checkboxes extends LayoutComponent<'Checkboxes'> {
  render(props: PropsFromGenericComponent<'Checkboxes'>): JSX.Element | null {
    return <CheckboxContainerComponent {...props} />;
  }

  renderWithLabel(): boolean {
    return false;
  }
}
