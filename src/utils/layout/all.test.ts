import dotenv from 'dotenv';

import { getLayoutComponentObject } from 'src/layout';
import { getAllLayoutSets } from 'src/utils/layout/getAllLayoutSets';
import { generateEntireHierarchy } from 'src/utils/layout/HierarchyGenerator';
import type { ILayouts } from 'src/layout/layout';
import type { IRepeatingGroups } from 'src/types';

describe('All known layout sets', () => {
  const env = dotenv.config();
  const dir = env.parsed?.ALTINN_ALL_APPS_DIR;
  if (!dir) {
    it('did not find any apps', () => {
      expect(true).toBeTruthy();
    });
    console.warn(
      'ALTINN_ALL_APPS_DIR should be set, please create a .env file and point it to a directory containing all known apps',
    );
    return;
  }

  const allLayoutSets = getAllLayoutSets(dir);
  it.each(allLayoutSets)('$appName/$setName', ({ layouts }) => {
    const firstKey = Object.keys(layouts)[0];
    const repeatingGroups = simpleRepeatingGroups(layouts);
    const nodes = generateEntireHierarchy(
      layouts,
      firstKey,
      repeatingGroups,
      {
        applicationSettings: null,
        instanceContext: null,
        formData: {},
        hiddenFields: new Set(),
        validations: {},
      },
      getLayoutComponentObject,
    );

    expect(nodes).not.toBeUndefined();
  });
});

function simpleRepeatingGroups(layouts: ILayouts) {
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
