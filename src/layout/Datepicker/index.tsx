import React from 'react';

import { DatepickerComponent } from 'src/layout/Datepicker/DatepickerComponent';
import { LayoutComponent } from 'src/layout/LayoutComponent';
import type { PropsFromGenericComponent } from 'src/layout';

export class Datepicker extends LayoutComponent<'Datepicker'> {
  render(props: PropsFromGenericComponent<'Datepicker'>): JSX.Element | null {
    return <DatepickerComponent {...props} />;
  }
}
