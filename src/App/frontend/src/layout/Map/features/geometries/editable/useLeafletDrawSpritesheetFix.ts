import { useEffect } from 'react';

import DrawSpriteSheetPng from 'leaflet-draw/dist/images/spritesheet.png';
import DrawSpriteSheetPng2x from 'leaflet-draw/dist/images/spritesheet-2x.png';

const STYLE_ID = 'leaflet-draw-spritesheet-override';

/**
 * Hook to fix leaflet-draw spritesheet paths by overriding the CSS with webpack-processed image URLs.
 * This is needed because the default leaflet-draw.css references relative image paths that don't work
 * after webpack processing.
 */
export function useLeafletDrawSpritesheetFix() {
  useEffect(() => {
    // Only inject the style once globally
    if (document.getElementById(STYLE_ID)) {
      return;
    }

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .leaflet-draw-toolbar a {
        background-image: url(${DrawSpriteSheetPng}) !important;
      }
      .leaflet-retina .leaflet-draw-toolbar a {
        background-image: url(${DrawSpriteSheetPng2x}) !important;
      }
    `;
    document.head.appendChild(style);
  }, []);
}
