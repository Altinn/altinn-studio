import React from 'react';
import { render, screen, waitForElementToBeRemoved } from '@testing-library/react';
import { MockServicesContextWrapper } from '../../dashboardTestUtils';
import { Dashboard } from './Dashboard';
import { textMock } from '../../../testing/mocks/i18nMock';
import { User } from 'app-shared/types/User';
import { starredRepoMock } from '../../data-mocks/starredRepoMock';
import { searchedRepos } from '../../data-mocks/searchedReposMock';
import { SelectedContextType } from 'app-shared/navigation/main-header/Header';
import { ServicesContextProps } from 'app-shared/contexts/ServicesContext';

const renderWithMockServices = (services?: Partial<ServicesContextProps>) => {
  render(
    <MockServicesContextWrapper customServices={services}>
      <Dashboard organizations={[]} user={{} as User} />
    </MockServicesContextWrapper>
  );
};

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useParams: () => ({
    selectedContext: SelectedContextType.Self
  }),
}));

describe('Dashboard', () => {

  test('should display spinner while loading starred repositories', () => {
    renderWithMockServices();
    expect(screen.getByText(textMock('dashboard.loading'))).toBeInTheDocument();
  });

  test('should display no favorites when starred repos is empty', async () => {
    renderWithMockServices({ getStarredRepos: () => Promise.resolve([]) });
    expect(await screen.findByText(textMock('dashboard.no_repos_result'))).toBeInTheDocument();
  });

  test('should display favorite list with one item', async () => {
    renderWithMockServices({ getStarredRepos: () => Promise.resolve([starredRepoMock]) });
    await waitForElementToBeRemoved(() => screen.queryByText(textMock('dashboard.loading')));
    expect(await screen.findAllByRole('menuitem', { name: textMock('dashboard.unstar') })).toHaveLength(1);
  });

  test('should display list of my application', async () => {
    renderWithMockServices({ searchRepos: () => Promise.resolve(searchedRepos) });
    await waitForElementToBeRemoved(() => screen.queryByText(textMock('dashboard.loading')));
    expect(await screen.findAllByRole('menuitem', { name: textMock('dashboard.star') })).toHaveLength(1);
  });
});
