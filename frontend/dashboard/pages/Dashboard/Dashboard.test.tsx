import React from 'react';
import { render, screen, waitForElementToBeRemoved } from '@testing-library/react';
import { MockServicesContextWrapper, Services } from '../../dashboardTestUtils';
import { Dashboard } from './Dashboard';
import { textMock } from '../../../testing/mocks/i18nMock';
import { User } from 'dashboard/services/userService';
import { SearchRepository } from 'dashboard/services/repoService';
import { starredRepo } from '../../data-mocks/starredRepo';
import { searchedRepos } from '../../data-mocks/searchedRepos';
import { SelectedContextType } from 'app-shared/navigation/main-header/Header';

type RenderWithMockServicesProps = Services;
const renderWithMockServices = (services?: RenderWithMockServicesProps) => {
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
    renderWithMockServices({
      repoService: {
        getStarredRepos: () => Promise.resolve([]),
      },
    });
    expect(await screen.findByText(textMock('dashboard.no_repos_result'))).toBeInTheDocument();
  });

  test('should display favorite list with one item', async () => {
    renderWithMockServices({
      repoService: {
        getStarredRepos: () => Promise.resolve([starredRepo]),
      },
    });
    await waitForElementToBeRemoved(() => screen.queryByText(textMock('dashboard.loading')));
    expect(await screen.findAllByRole('menuitem', { name: textMock('dashboard.unstar') })).toHaveLength(1);
  });

  test('should display list of my application', async () => {
    renderWithMockServices({
      repoService: {
        searchRepos: () => Promise.resolve({ ...searchedRepos } as unknown as SearchRepository),
      },
    });
    await waitForElementToBeRemoved(() => screen.queryByText(textMock('dashboard.loading')));
    expect(await screen.findAllByRole('menuitem', { name: textMock('dashboard.star') })).toHaveLength(1);
  });
});
