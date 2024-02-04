import React from 'react';
import { render, screen } from '@testing-library/react';
import { MockServicesContextWrapper } from '../../dashboardTestUtils';
import { Dashboard } from './Dashboard';
import { textMock } from '../../../testing/mocks/i18nMock';
import type { Repository, User } from 'app-shared/types/Repository';
import { SelectedContextType } from 'app-shared/navigation/main-header/Header';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { repository, searchRepositoryResponse } from 'app-shared/mocks/mocks';
import type { SearchRepositoryResponse } from 'app-shared/types/api';

const renderWithMockServices = (services?: Partial<ServicesContextProps>) => {
  render(
    <MockServicesContextWrapper customServices={services}>
      <Dashboard organizations={[]} user={{} as User} />
    </MockServicesContextWrapper>,
  );
};

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({
    selectedContext: SelectedContextType.Self,
  }),
}));

describe('Dashboard', () => {
  test('should display favorite list with one item', async () => {
    renderWithMockServices({
      getStarredRepos: () => Promise.resolve<Repository[]>([repository]),
    });
    expect(
      await screen.findAllByRole('menuitem', {
        name: textMock('dashboard.unstar', { appName: repository.name }),
      }),
    ).toHaveLength(1);
  });

  test('should display list of my application', async () => {
    renderWithMockServices({
      searchRepos: () =>
        Promise.resolve<SearchRepositoryResponse>({
          ...searchRepositoryResponse,
          data: [repository],
        }),
    });
    expect(
      await screen.findAllByRole('menuitem', {
        name: textMock('dashboard.star', { appName: repository.name }),
      }),
    ).toHaveLength(1);
  });
});
