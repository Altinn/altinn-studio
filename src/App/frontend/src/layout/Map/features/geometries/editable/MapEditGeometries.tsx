import React, { useEffect, useRef } from 'react';
import { FeatureGroup } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';

import { geojsonToWKT } from '@terraformer/wkt';
// Import GeoJSON type
import L from 'leaflet';
import { v4 as uuidv4 } from 'uuid';
import type { Feature } from 'geojson';

import { FD } from 'src/features/formData/FormDataWrite';
import { ALTINN_ROW_ID } from 'src/features/formData/types';
import { toRelativePath } from 'src/features/saveToGroup/useSaveToGroup';
import { useLeafletDrawSpritesheetFix } from 'src/layout/Map/features/geometries/editable/useLeafletDrawSpritesheetFix';
import { useMapParsedGeometries } from 'src/layout/Map/features/geometries/fixed/hooks';
import { useDataModelBindingsFor } from 'src/utils/layout/hooks';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';

interface FeatureWithId extends Feature {
  properties: {
    altinnRowId?: string;
  };
}
interface MapEditGeometriesProps {
  baseComponentId: string;
}

export function MapEditGeometries({ baseComponentId }: MapEditGeometriesProps) {
  const { geometryType } = useItemWhenType(baseComponentId, 'Map');

  const editRef = useRef<L.FeatureGroup>(null);

  const geometryBinding = useDataModelBindingsFor(baseComponentId, 'Map')?.geometries;
  const geometryDataBinding = useDataModelBindingsFor(baseComponentId, 'Map')?.geometryData;
  const isEditableBinding = useDataModelBindingsFor(baseComponentId, 'Map')?.geometryIsEditable;
  const geometryDataFieldName = geometryDataBinding?.field.split('.').pop();
  const isEditableFieldName = isEditableBinding?.field.split('.').pop();
  const initialGeometries = useMapParsedGeometries(baseComponentId)?.filter((g) => g.isEditable);

  const geometryDataPath = toRelativePath(geometryBinding, geometryDataBinding);

  const appendToList = FD.useAppendToList();
  const setLeafValue = FD.useSetLeafValue();
  const removeFromList = FD.useRemoveFromListCallback();

  const { toolbar } = useItemWhenType(baseComponentId, 'Map');

  useLeafletDrawSpritesheetFix();

  // Load initial data into the FeatureGroup on component mount
  useEffect(() => {
    const featureGroup = editRef.current;
    if (featureGroup && initialGeometries) {
      // Clear existing layers to prevent duplication if initialData changes
      featureGroup.clearLayers();

      initialGeometries.forEach((item) => {
        if (item.data && item.data.type === 'FeatureCollection') {
          item.data.features.forEach((feature: Feature) => {
            // Attach the unique ID to the feature's properties
            const newFeature: FeatureWithId = {
              ...feature,
              properties: {
                ...feature.properties,
                altinnRowId: item.altinnRowId,
              },
            };

            // Create a GeoJSON layer for the single feature and add it to the group
            const leafletLayer = L.geoJSON(newFeature);
            leafletLayer.eachLayer((layer) => {
              featureGroup.addLayer(layer);
            });
          });
        } else {
          // Handle case where item.data is a single Feature / PolyLine / Polygon, etc.
          const geoData = item.data;

          const isFeature = 'type' in geoData && geoData.type === 'Feature';

          const newFeature: FeatureWithId = isFeature
            ? {
                ...(geoData as Feature),
                properties: {
                  ...(geoData as Feature).properties,
                  altinnRowId: item.altinnRowId,
                },
              }
            : {
                type: 'Feature',
                geometry: geoData,
                properties: {
                  altinnRowId: item.altinnRowId,
                },
              };

          const leafletLayer = L.geoJSON(newFeature);
          leafletLayer.eachLayer((layer) => {
            featureGroup.addLayer(layer);
          });
        }
      });
    }
  }, [initialGeometries]);

  const onCreatedHandler = (e: L.DrawEvents.Created) => {
    if (!geometryBinding || !geometryDataFieldName || !isEditableFieldName) {
      return;
    }

    const uuid = uuidv4();
    const layer = e.layer;
    const geo = layer.toGeoJSON();

    // Ensure the Leaflet layer object itself knows its ID for future edits
    if (!layer.feature) {
      layer.feature = { type: 'Feature', geometry: geo.geometry, properties: {} };
    }
    layer.feature.properties = {
      ...layer.feature.properties,
      altinnRowId: uuid,
    };

    let geoString = JSON.stringify(geo);
    if (geometryType === 'WKT') {
      geoString = geojsonToWKT(geo.geometry);
    }

    appendToList({
      reference: geometryBinding,
      newValue: {
        [ALTINN_ROW_ID]: uuid,
        [geometryDataFieldName]: geoString,
        [isEditableFieldName]: true,
      },
    });
  };

  const onEditedHandler = (e: L.DrawEvents.Edited) => {
    if (!geometryBinding || !geometryDataBinding || !isEditableBinding) {
      return;
    }

    e.layers.eachLayer((layer) => {
      // @ts-expect-error - Leaflet's typings don't guarantee feature or properties exist, but we ensure they do in onCreatedHandler
      const editedGeo = layer.toGeoJSON();
      const altinnRowId = editedGeo.properties?.altinnRowId;

      let geoString = JSON.stringify(editedGeo);

      if (geometryType === 'WKT') {
        geoString = geojsonToWKT(editedGeo.geometry);
      }

      initialGeometries?.forEach((g, index) => {
        if (g.altinnRowId === altinnRowId) {
          const field = `${geometryBinding.field}[${index}].${geometryDataPath}`;
          setLeafValue({
            reference: { dataType: geometryDataBinding?.dataType, field },
            newValue: geoString,
          });
        }
      });
    });
  };

  const onDeletedHandler = (e: L.DrawEvents.Deleted) => {
    if (!geometryBinding) {
      return;
    }

    e.layers.eachLayer((layer) => {
      // @ts-expect-error - Leaflet's typings don't guarantee feature or properties exist, but we ensure they do in onCreatedHandler
      const deletedGeo = layer.toGeoJSON();
      removeFromList({
        reference: geometryBinding,
        callback: (item) => item[ALTINN_ROW_ID] === deletedGeo.properties?.altinnRowId,
      });
    });
  };

  return (
    <FeatureGroup ref={editRef}>
      <EditControl
        position='topright'
        onCreated={onCreatedHandler}
        onEdited={onEditedHandler}
        onDeleted={onDeletedHandler}
        draw={{
          polyline: !!toolbar?.polyline,
          polygon: !!toolbar?.polygon,
          rectangle: !!toolbar?.rectangle,
          circle: !!toolbar?.circle,
          marker: !!toolbar?.marker,
          circlemarker: false,
        }}
      />
    </FeatureGroup>
  );
}
