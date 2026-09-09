/**
 * leaflet-draw's dist file is a plain browser script that attaches itself to the global `L`
 * (leaflet) object and exports nothing. react-leaflet-draw still does
 * `import Draw from 'leaflet-draw'` (the value is never used - it's a side-effect import),
 * which Rolldown rejects with MISSING_EXPORT since the module has no default export.
 * The exact-match `leaflet-draw` alias in vite.config.ts points here instead, keeping the
 * side effect and providing the (unused) default export.
 */
import 'leaflet-draw/dist/leaflet.draw.js';

// eslint-disable-next-line import/no-default-export
export default undefined;
