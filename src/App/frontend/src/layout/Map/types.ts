import type { GeoJSON } from 'geojson';

export type RawGeometry = {
  altinnRowId: string;
  data: string;
  label?: string;
  isEditable?: boolean;
};

export type Geometry = {
  altinnRowId: string;
  data: GeoJSON;
  label?: string;
  isEditable?: boolean;
};

export type Location = {
  latitude: number;
  longitude: number;
};
