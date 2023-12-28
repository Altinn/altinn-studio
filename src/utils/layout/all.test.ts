import { getHierarchyDataSourcesMock } from 'src/__mocks__/getHierarchyDataSourcesMock';
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
    // TODO: We should generate some sensible form data for repeating groups (and their nodes) to work, so that
    // we can test those as well. It could be as simple as analyzing the layout and generating a form data object
    // with one entry for each repeating group.

    const firstKey = Object.keys(layouts)[0];
    const nodes = generateEntireHierarchy(layouts, firstKey, getHierarchyDataSourcesMock(), getLayoutComponentObject);

    expect(nodes).not.toBeUndefined();
  });
});
