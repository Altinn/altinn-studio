import { RepositoryType } from 'app-shared/types/global';
import type { TopBarMenuItem } from './appBarConfig';
import { getTopBarMenu, menu, TopBarMenu } from './appBarConfig';

describe('getTopBarMenu', () => {
  it('should return all items when provided repository type is "App"', () => {
    expect(getTopBarMenu(RepositoryType.App)).toEqual(menu);
  });

  it('should return only menu items relevant for datamodelling repo when provided repo type is "Datamodels"', () => {
    const expected: TopBarMenuItem[] = [
      {
        key: TopBarMenu.About,
        link: '/:org/:app',
        repositoryTypes: [RepositoryType.App, RepositoryType.Datamodels],
      },
      {
        key: TopBarMenu.Datamodel,
        link: '/:org/:app/datamodel',
        repositoryTypes: [RepositoryType.App, RepositoryType.Datamodels],
      },
    ];

    expect(getTopBarMenu(RepositoryType.Datamodels)).toEqual(expected);
  });

  it('should return empty list when provided repo type is "Unknown"', () => {
    const expected: TopBarMenuItem[] = [];

    expect(getTopBarMenu(RepositoryType.Unknown)).toEqual(expected);
  });
});
