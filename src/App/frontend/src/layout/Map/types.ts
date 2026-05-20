import type { GeoJSON } from 'geojson';

export type RawGeometry = {
  altinnRowId: string;
  data: string;
  label?: string;
  isEditable?: boolean;
  isHidden?: boolean;
  style?: string;
};

export type Geometry = {
  altinnRowId: string;
  data: GeoJSON;
  label?: string;
  isEditable?: boolean;
  isHidden?: boolean;
  style?: string;
};

export type Location = {
  latitude: number;
  longitude: number;
};
