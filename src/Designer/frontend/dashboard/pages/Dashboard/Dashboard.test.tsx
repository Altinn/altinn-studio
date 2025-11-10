import React from 'react';
import { screen, waitForElementToBeRemoved, within } from '@testing-library/react';
import { Dashboard } from './Dashboard';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { User } from 'app-shared/types/Repository';
import { SelectedContextType } from '../../enums/SelectedContextType';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { repository, searchRepositoryResponse } from 'app-shared/mocks/mocks';
import { DATA_MODEL_REPO_IDENTIFIER } from '../../constants';
import { renderWithProviders } from 'dashboard/testing/mocks';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';

const renderWithMockServices = (services?: Partial<ServicesContextProps>) => {
  renderWithProviders(<Dashboard organizations={[]} user={{} as User} />, {
    queries: services,
    queryClient: createQueryClientMock(),
  });
};

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({
    selectedContext: SelectedContextType.Self,
  }),
}));

describe('Dashboard', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should display favorite list with one item', async () => {
    renderWithMockServices({
      getStarredRepos: jest.fn().mockResolvedValue([{ ...repository, hasStarred: true }]),
    });

    await waitForElementToBeRemoved(() => screen.queryAllByLabelText(textMock('general.loading')));

    const starredHeading = screen.getByRole('heading', {
      name: textMock('dashboard.favourites'),
    });
    //eslint-disable-next-line testing-library/no-node-access
    const starredContainer = starredHeading.closest('div');
    const starredRepos = await within(starredContainer).findAllByTitle(
      textMock('dashboard.unstar', { appName: repository.name }),
    );

    expect(starredRepos).toHaveLength(1);
  });

  it('should display application list with one item', async () => {
    renderWithMockServices({
      searchRepos: jest.fn().mockResolvedValue({
        ...searchRepositoryResponse,
        data: [repository],
      }),
    });

    await waitForElementToBeRemoved(() => screen.queryAllByLabelText(textMock('general.loading')));

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
      searchRepos: jest.fn().mockResolvedValue({
        ...searchRepositoryResponse,
        data: [dataModelsRepository],
      }),
    });

    await waitForElementToBeRemoved(() => screen.queryAllByLabelText(textMock('general.loading')));

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
