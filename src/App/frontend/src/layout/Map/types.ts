import type { GeoJSON } from 'geojson';

export type RawGeometry = {
  altinnRowId: string;
  data: string;
  label?: string;
};

export type Geometry = {
  altinnRowId: string;
  data: GeoJSON;
  label?: string;
};
