import React from 'react';

import { LayoutComponent } from 'src/layout/LayoutComponent';
import { MapComponent } from 'src/layout/Map/MapComponent';
import type { PropsFromGenericComponent } from 'src/layout';

export class Map extends LayoutComponent<'Map'> {
  render(props: PropsFromGenericComponent<'Map'>): JSX.Element | null {
    return <MapComponent {...props} />;
  }
}
