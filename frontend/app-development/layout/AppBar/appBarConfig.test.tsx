import React from 'react';
import { Link } from 'react-router-dom';
import { RepositoryType } from 'app-shared/types/global';
import { TopBarMenu, TopBarMenuItem } from './appBarConfig';
import { mockUseTranslation } from '../../../testing/mocks/i18nMock';
import { getTopBarMenu, menu } from './appBarConfig';
import { AltinnHeaderMenuItem } from 'app-shared/components/altinnHeaderMenu/AltinnHeaderMenu';

describe('getTopBarMenu', () => {
  const { t } = mockUseTranslation();
  it('should return all items when provided repository type is "App"', () => {
    expect(getTopBarMenu('test-org', 'test-app', RepositoryType.App, t)).toHaveLength(menu.length);
  });

  it('should return only menu items relevant for datamodelling repo when provided repo type is "Datamodels"', () => {
    const expected: AltinnHeaderMenuItem[] = [
      {
        key: TopBarMenu.About,
        link: LinkItem('/test-org/test-app', t('top_menu.about')),
      },
      {
        key: TopBarMenu.Datamodel,
        link: LinkItem('/test-org/test-app/datamodel', t('top_menu.datamodel')),
      },
    ];

    expect(getTopBarMenu('test-org', 'test-app', RepositoryType.Datamodels, t)).toEqual(expected);
  });

  it('should return empty list when provided repo type is "Unknown"', () => {
    const expected: TopBarMenuItem[] = [];

    expect(getTopBarMenu('test-org', 'test-app', RepositoryType.Unknown, t)).toEqual(expected);
  });
});

export const LinkItem = (to: string, text: string) => {
  return <Link to={to}>{text} </Link>;
};
