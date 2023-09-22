import { getHierarchyDataSourcesMock } from 'src/__mocks__/hierarchyMock';
import { generateSimpleRepeatingGroups } from 'src/features/layout/repGroups/generateSimpleRepeatingGroups';
import { getLayoutComponentObject } from 'src/layout';
import { ensureAppsDirIsSet, getAllLayoutSets } from 'src/test/allApps';
import { generateEntireHierarchy } from 'src/utils/layout/HierarchyGenerator';

describe('All known layout sets should evaluate as a hierarchy', () => {
  const dir = ensureAppsDirIsSet();
  if (!dir) {
    return;
  }

  const allLayoutSets = getAllLayoutSets(dir);
  it.each(allLayoutSets)('$appName/$setName', ({ layouts }) => {
    const firstKey = Object.keys(layouts)[0];
    const repeatingGroups = generateSimpleRepeatingGroups(layouts);
    const nodes = generateEntireHierarchy(
      layouts,
      firstKey,
      repeatingGroups,
      getHierarchyDataSourcesMock(),
      getLayoutComponentObject,
    );

    expect(nodes).not.toBeUndefined();
  });
});
