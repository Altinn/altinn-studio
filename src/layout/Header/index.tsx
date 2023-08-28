import React from 'react';

import { HeaderDef } from 'src/layout/Header/config.def.generated';
import { HeaderComponent } from 'src/layout/Header/HeaderComponent';
import type { PropsFromGenericComponent } from 'src/layout';

export class Header extends HeaderDef {
  render(props: PropsFromGenericComponent<'Header'>): JSX.Element | null {
    return <HeaderComponent {...props} />;
  }
}
