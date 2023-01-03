import React from 'react';

import { LayoutComponent } from 'src/layout/LayoutComponent';
import { MultipleSelectComponent } from 'src/layout/MultipleSelect/MultipleSelectComponent';
import type { PropsFromGenericComponent } from 'src/layout';

export class MultipleSelect extends LayoutComponent<'MultipleSelect'> {
  render(props: PropsFromGenericComponent<'MultipleSelect'>): JSX.Element | null {
    return <MultipleSelectComponent {...props} />;
  }
}
