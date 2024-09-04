import type { GeoJSON } from 'geojson';

export type RawGeometry = {
  data: string;
  label?: string;
};

export type Geometry = {
  data: GeoJSON;
  label?: string;
};
