import React from 'react';
import { render, screen, waitForElementToBeRemoved } from '@testing-library/react';
import { MockServicesContextWrapper, Services } from '../../dashboardTestUtils';
import { Dashboard } from './Dashboard';
import { mockUseTranslation } from '../../../testing/mocks/i18nMock';
import { User } from 'dashboard/services/userService';
import { SearchRepository } from 'dashboard/services/repoService';
import { starredRepo } from '../../data-mocks/starredRepo';
import { searchedRepos } from '../../data-mocks/searchedRepos';

jest.mock('react-i18next', () => ({ useTranslation: () => mockUseTranslation() }));

type RenderWithMockServicesProps = Services;
const renderWithMockServices = (services?: RenderWithMockServicesProps) => {
  render(
    <MockServicesContextWrapper
      customServices={{
        userService: {
          ...services?.userService,
        },
        organizationService: {
          ...services?.organizationService,
        },
        repoService: {
          ...services?.repoService,
        },
      }}
    >
      <Dashboard organizations={[]} user={{} as User} />
    </MockServicesContextWrapper>
  );
};

test('should display spinner while loading starred repositories', () => {
  renderWithMockServices();
  expect(screen.getByText(/dashboard.loading/)).toBeInTheDocument();
});

test('should display no favorites when starred repos is empty', async () => {
  renderWithMockServices({
    repoService: {
      getStarredRepos: () => Promise.resolve([]),
    },
  });
  expect(await screen.findByText('dashboard.no_repos_result')).toBeInTheDocument();
});

test('should display favorite list with one item', async () => {
  renderWithMockServices({
    repoService: {
      getStarredRepos: () => Promise.resolve([starredRepo]),
    },
  });
  await waitForElementToBeRemoved(() => screen.queryByText(/dashboard.loading/));
  expect(await screen.findAllByRole('menuitem', { name: /dashboard.unstar/ })).toHaveLength(1);
});

test('should display list of my application', async () => {
  renderWithMockServices({
    repoService: {
      searchRepos: () => Promise.resolve({ ...searchedRepos } as unknown as SearchRepository),
    },
  });
  await waitForElementToBeRemoved(() => screen.queryByText(/dashboard.loading/));
  expect(await screen.findAllByRole('menuitem', { name: /dashboard.star/ })).toHaveLength(1);
});

