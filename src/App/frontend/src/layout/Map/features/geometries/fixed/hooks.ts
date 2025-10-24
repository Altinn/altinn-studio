import { useMemo } from 'react';

import dot from 'dot-object';
import { geoJson, LatLngBounds } from 'leaflet';
import WKT from 'terraformer-wkt-parser';
import type { GeoJSON } from 'geojson';

import { FD } from 'src/features/formData/FormDataWrite';
import { ALTINN_ROW_ID } from 'src/features/formData/types';
import { toRelativePath } from 'src/features/saveToGroup/useSaveToGroup';
import { useDataModelBindingsFor, useExternalItem } from 'src/utils/layout/hooks';
import type { IGeometryType } from 'src/layout/Map/config.generated';
import type { Geometry, RawGeometry } from 'src/layout/Map/types';

export function useMapRawGeometries(baseComponentId: string): RawGeometry[] | undefined {
  const dataModelBindings = useDataModelBindingsFor(baseComponentId, 'Map');
  const formData = FD.useDebouncedPick(dataModelBindings?.geometries);

  return useMemo(() => {
    if (!formData || !Array.isArray(formData)) {
      return formData as RawGeometry[] | undefined;
    }

    const labelPath = toRelativePath(dataModelBindings?.geometries, dataModelBindings?.geometryLabel) ?? 'label';
    const dataPath = toRelativePath(dataModelBindings?.geometries, dataModelBindings?.geometryData) ?? 'data';

    return formData.map((item: unknown): RawGeometry => {
      if (!item || typeof item !== 'object' || !item[ALTINN_ROW_ID]) {
        throw new Error(
          `Invalid geometry item: ${JSON.stringify(item)} (expected object with ${ALTINN_ROW_ID} property)`,
        );
      }

      return {
        altinnRowId: item[ALTINN_ROW_ID],
        data: dot.pick(dataPath, item),
        label: dot.pick(labelPath, item),
      };
    });
  }, [dataModelBindings?.geometries, dataModelBindings?.geometryData, dataModelBindings?.geometryLabel, formData]);
}

export function useMapParsedGeometries(baseComponentId: string): Geometry[] | null {
  const geometryType = useExternalItem(baseComponentId, 'Map').geometryType;
  const rawGeometries = useMapRawGeometries(baseComponentId);

  return useMemo(() => {
    try {
      return parseGeometries(rawGeometries, geometryType);
    } catch {
      throw new Error(
        `Failed to parse geometry data as ${geometryType}:\n- ${rawGeometries?.map((g) => JSON.stringify(g)).join('\n- ')}`,
      );
    }
  }, [geometryType, rawGeometries]);
}

export function useMapGeometryBounds(baseComponentId: string) {
  const geometries = useMapParsedGeometries(baseComponentId);
  return useMemo(() => calculateBounds(geometries), [geometries]);
}

function parseGeometries(geometries: RawGeometry[] | undefined, geometryType?: IGeometryType): Geometry[] | null {
  if (!geometries) {
    return null;
  }

  const out: Geometry[] = [];
  for (const { altinnRowId, data: rawData, label } of geometries) {
    if (geometryType === 'WKT') {
      const data = WKT.parse(rawData);
      out.push({ altinnRowId, data, label });
    } else {
      const data = JSON.parse(rawData) as GeoJSON;
      out.push({ altinnRowId, data, label });
    }
  }

  return out;
}

function calculateBounds(geometries: Geometry[] | null): LatLngBounds | undefined {
  if (!geometries?.length) {
    return undefined;
  }

  const bounds: [[number, number], [number, number]] = geometries.reduce(
    (currentBounds, { data }) => {
      const bounds = geoJson(data).getBounds();
      currentBounds[0][0] = Math.min(bounds.getSouth(), currentBounds[0][0]);
      currentBounds[0][1] = Math.min(bounds.getWest(), currentBounds[0][1]);
      currentBounds[1][0] = Math.max(bounds.getNorth(), currentBounds[1][0]);
      currentBounds[1][1] = Math.max(bounds.getEast(), currentBounds[1][1]);
      return currentBounds;
    },
    [
      [90, 180],
      [-90, -180],
    ],
  );

  return new LatLngBounds(bounds);
}
