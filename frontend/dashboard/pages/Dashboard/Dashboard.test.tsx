import React from 'react';
import { render, screen, waitForElementToBeRemoved, within } from '@testing-library/react';
import { MockServicesContextWrapper } from '../../dashboardTestUtils';
import { Dashboard } from './Dashboard';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { Repository, User } from 'app-shared/types/Repository';
import { SelectedContextType } from 'dashboard/context/HeaderContext';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { repository, searchRepositoryResponse } from 'app-shared/mocks/mocks';
import type { SearchRepositoryResponse } from 'app-shared/types/api';
import { DATA_MODEL_REPO_IDENTIFIER } from '../../constants';

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
  it('should display favorite list with one item', async () => {
    renderWithMockServices({
      getStarredRepos: () => Promise.resolve<Repository[]>([repository]),
    });

    await waitForElementToBeRemoved(() => screen.queryAllByText(textMock('general.loading')));

    const starredHeading = screen.getByRole('heading', {
      name: textMock('dashboard.favourites'),
    });
    //eslint-disable-next-line testing-library/no-node-access
    const starredContainer = starredHeading.closest('div');
    const starredRepos = within(starredContainer).getAllByTitle(
      textMock('dashboard.unstar', { appName: repository.name }),
    );

    expect(starredRepos).toHaveLength(1);
  });

  it('should display application list with one item', async () => {
    renderWithMockServices({
      searchRepos: () =>
        Promise.resolve<SearchRepositoryResponse>({
          ...searchRepositoryResponse,
          data: [repository],
        }),
    });

    await waitForElementToBeRemoved(() => screen.queryAllByText(textMock('general.loading')));

    const appsHeading = screen.getByRole('heading', { name: /apps/ });
    //eslint-disable-next-line testing-library/no-node-access
    const appsContainer = appsHeading.closest('div');
    const appRepos = within(appsContainer).getAllByTitle(
      textMock('dashboard.star', { appName: repository.name }),
    );

    expect(appRepos).toHaveLength(1);
  });

  it('should display data model list with one item', async () => {
    const appName = DATA_MODEL_REPO_IDENTIFIER;
    const dataModelsRepository = {
      ...repository,
      full_name: `ttd/${appName}`,
      name: appName,
    };

    renderWithMockServices({
      searchRepos: () =>
        Promise.resolve<SearchRepositoryResponse>({
          ...searchRepositoryResponse,
          data: [dataModelsRepository],
        }),
    });

    await waitForElementToBeRemoved(() => screen.queryAllByText(textMock('general.loading')));

    const dataModelHeading = screen.getByRole('heading', {
      name: textMock('dashboard.my_data_models'),
    });
    //eslint-disable-next-line testing-library/no-node-access
    const dataModelContainer = dataModelHeading.closest('div');
    const dataModelRepos = within(dataModelContainer).getAllByTitle(
      textMock('dashboard.star', { appName: appName }),
    );

    expect(dataModelRepos).toHaveLength(1);
  });
});
