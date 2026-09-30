import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

import { useLanguage } from 'src/features/language/useLanguage';
import { useItemWhenType } from 'src/utils/layout/useNodeItem';

interface MapRegionA11yProps {
  baseComponentId: string;
}

/**
 * Sets accessibility attributes directly on the Leaflet container element.
 *
 * Must be rendered as a child of <MapContainer> so that `useMap()` resolves the Leaflet instance.
 * We set the attributes on the real container (via `getContainer()`) rather than forwarding props,
 * because MapContainer does not forward arbitrary DOM attributes.
 *
 * - `role="group"` keeps the screen reader in browse mode so map content (e.g. geometry tooltip
 *   labels) stays explorable, while still grouping the map under a single named element. We
 *   deliberately use `group` rather than the `region` landmark: a page may contain multiple maps
 *   (and an app author may reuse the same title), which would produce duplicate landmarks and fail
 *   the `landmark-unique` WCAG rule. `group` provides the same named grouping without that
 *   uniqueness constraint.
 * - `aria-label` gives the group a localized accessible name. The component's own label (rendered
 *   separately by ComponentStructureWrapper) is prepended so it is announced first when the map
 *   gets focus, followed by the interaction instructions. This way the map is announced once
 *   instead of as a run-on concatenation of its inner controls.
 */
export function MapRegionA11y({ baseComponentId }: MapRegionA11yProps) {
  const map = useMap();
  const { langAsString } = useLanguage();
  const { textResourceBindings } = useItemWhenType(baseComponentId, 'Map');
  const title = textResourceBindings?.title;
  const label = title ? langAsString(title) : undefined;

  const instructions = langAsString('map_component.ariaLabel');
  const ariaLabel = label ? `${label}. ${instructions}` : instructions;

  useEffect(() => {
    const container = map.getContainer();
    container.setAttribute('role', 'group');
    container.setAttribute('aria-label', ariaLabel);
  }, [map, ariaLabel]);

  return null;
}
