import type { Location, MapLayer } from '@altinn/altinn-design-system';

import type { ILayoutCompBase } from 'src/layout/layout';

export interface ILayoutCompMap extends ILayoutCompBase<'Map'> {
  layers?: MapLayer[];
  centerLocation?: Location;
  zoom?: number;
}
