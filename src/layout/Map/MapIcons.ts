import Marker from 'leaflet/dist/images/marker-icon.png';
import RetinaMarker from 'leaflet/dist/images/marker-icon-2x.png';
import MarkerShadow from 'leaflet/dist/images/marker-shadow.png';
import type { Map } from '@altinn/altinn-design-system';

type MapProps = Parameters<typeof Map>[0];
export const markerIcon: MapProps['markerIcon'] = {
  iconUrl: Marker,
  iconRetinaUrl: RetinaMarker,
  shadowUrl: MarkerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
};
