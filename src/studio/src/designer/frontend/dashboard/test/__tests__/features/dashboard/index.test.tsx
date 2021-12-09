import { shallow } from 'enzyme';
import 'jest';
import * as React from 'react';
import { Dashboard } from '../../../../features/dashboard';
import { FavoriteReposList } from '../../../../features/dashboard/FavoriteReposList';
import { OrgReposList } from '../../../../features/dashboard/OrgReposList';
import { SearchResultReposList } from '../../../../features/dashboard/SearchResultReposList';

jest.mock('react-redux', () => {
  const RealModule = jest.requireActual('react-redux');
  return {
    ...RealModule,
    useSelector: jest.fn().mockReturnValue({ language: {}}),
  };
});

const mockUseState = jest.fn().mockReturnValue('');

describe('Dashboard > index', () => {
  it('displays FavoriteReposList and OrgReposList by default', () => {
    const dashboard = shallow(<Dashboard />);
    expect(dashboard.containsMatchingElement(<FavoriteReposList />)).toBe(true);
    expect(dashboard.containsMatchingElement(<OrgReposList />)).toBe(true);
    expect(dashboard.containsMatchingElement(<SearchResultReposList searchValue='' />)).toBe(false);
  });

  it('displays search result and hides FavoriteReposList and OrgReposList when the user searches for repo', async () => {
    const searchValue = 'test'
    jest.spyOn(React, 'useState').mockImplementation(jest.fn().mockReturnValue([searchValue]));
    mockUseState.mockReturnValue(searchValue);
    const dashboard = shallow(<Dashboard />);
    expect(dashboard.containsMatchingElement(<FavoriteReposList />)).toBe(false);
    expect(dashboard.containsMatchingElement(<OrgReposList />)).toBe(false);
    expect(dashboard.containsMatchingElement(<SearchResultReposList searchValue={searchValue} />)).toBe(true);
  });
});
