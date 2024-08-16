// OLD appBarConfig test:
/*
describe('getTopBarMenu', () => {
  it('should return all items when provided repository type is "App" which is not hidden behind feature-flags', () => {
    const menuLength = topBarMenuItem.filter((menuItem) => !menuItem.featureFlagName).length;
    expect(getFilteredTopBarMenu(RepositoryType.App)).toHaveLength(menuLength);
  });

  it('Should only return the data model menu item when the provided repo type is "DataModels"', () => {
    const expected: HeaderMenuItem[] = [
      {
        key: HeaderMenuItemKey.DataModel,
        link: RoutePaths.DataModel,
        icon: DatabaseIcon,
        repositoryTypes: [RepositoryType.App, RepositoryType.DataModels],
        group: HeaderMenuGroupKey.Other,
      },
    ];

    expect(getFilteredTopBarMenu(RepositoryType.DataModels)).toEqual(expected);
  });

  it('should return empty list when provided repo type is "Unknown"', () => {
    const expected: HeaderMenuItem[] = [];

    expect(getFilteredTopBarMenu(RepositoryType.Unknown)).toEqual(expected);
  });

  it('should return menu items including items hidden behind feature flag, if the flag i activated', () => {
    typedLocalStorage.setItem('featureFlags', []); // Add the flags in the array when you want to test it
    expect(getFilteredTopBarMenu(RepositoryType.App)).toHaveLength(topBarMenuItem.length);
  });
});
*/
