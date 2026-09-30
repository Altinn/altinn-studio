import React from 'react';

import { parseAndCleanText } from 'src/language/sharedLanguage';
import classes from 'src/layout/Map/MapComponent.module.css';
import { DefaultMapLayers } from 'src/layout/Map/utils';
import { useExternalItem } from 'src/utils/layout/hooks';

interface MapAttributionProps {
  baseComponentId: string;
}

/**
 * Renders the map layer attribution as plain text/links OUTSIDE the Leaflet container.
 *
 * Leaflet's built-in AttributionControl renders the attribution inside the map container, which
 * causes screen readers to read it as part of the map region and puts the attribution links in the
 * tab order of the map. By rendering the attribution ourselves as a sibling of the map, the map
 * region stays clean for assistive technology while the attribution remains visually present (as
 * required by the OpenStreetMap/Kartverket licenses) with working links.
 */
export function MapAttribution({ baseComponentId }: MapAttributionProps) {
  const customLayers = useExternalItem(baseComponentId, 'Map').layers;
  const layers = customLayers ?? DefaultMapLayers;

  // Collect unique, non-empty attributions in layer order (mirrors how Leaflet dedupes them)
  const attributions = Array.from(
    new Set(layers.map((layer) => layer.attribution?.trim()).filter((a): a is string => !!a)),
  );

  if (attributions.length === 0) {
    return null;
  }

  return (
    <p className={classes.attribution}>
      {attributions.map((attribution, i) => (
        <React.Fragment key={i}>
          {i > 0 && ' | '}
          {parseAndCleanText(attribution)}
        </React.Fragment>
      ))}
    </p>
  );
}
