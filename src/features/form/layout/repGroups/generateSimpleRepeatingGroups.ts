import type { ILayouts } from 'src/layout/layout';
import type { IRepeatingGroups } from 'src/types';

export function generateSimpleRepeatingGroups(layouts: ILayouts) {
  const out: IRepeatingGroups = {};
  for (const layout of Object.values(layouts)) {
    for (const component of layout || []) {
      if (component.type === 'Group') {
        out[component.id] = { index: 0 };
        out[`${component.id}-0`] = { index: 0 };
        out[`${component.id}-0-0`] = { index: 0 };
        out[`${component.id}-0-0-0`] = { index: 0 };
      }
    }
  }

  return out;
}
