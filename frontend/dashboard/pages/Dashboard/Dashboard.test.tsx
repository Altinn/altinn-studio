import React from 'react';
import { render, screen, waitForElementToBeRemoved, within } from '@testing-library/react';
import { MockServicesContextWrapper } from '../../dashboardTestUtils';
import { Dashboard } from './Dashboard';
import { textMock } from '@studio/testing/mocks/i18nMock';
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
    const starredRepos = within(starredContainer).getAllByTitle(textMock('dashboard.show_repo'));

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
    const appRepos = within(appsContainer).getAllByTitle(textMock('dashboard.show_repo'));

    expect(appRepos).toHaveLength(1);
  });

  it('should display datamodels list with one item', async () => {
    const dataModelsRepository = { ...repository, name: '-datamodels' };
    renderWithMockServices({
      searchRepos: () =>
        Promise.resolve<SearchRepositoryResponse>({
          ...searchRepositoryResponse,
          data: [dataModelsRepository],
        }),
    });

    await waitForElementToBeRemoved(() => screen.queryAllByText(textMock('general.loading')));

    const dataModelHeading = screen.getByRole('heading', { name: /datamodels/ });
    //eslint-disable-next-line testing-library/no-node-access
    const dataModelContainer = dataModelHeading.closest('div');
    const dataModelRepos = within(dataModelContainer).getAllByTitle(
      textMock('dashboard.show_repo'),
    );

    expect(dataModelRepos).toHaveLength(1);
  });

  it('should not render datamodels list if there are no datamodels', async () => {
    renderWithMockServices({
      searchRepos: () =>
        Promise.resolve<SearchRepositoryResponse>({
          ...searchRepositoryResponse,
          data: [repository],
        }),
    });

    await waitForElementToBeRemoved(() => screen.queryAllByText(textMock('general.loading')));

    const dataModelHeading = screen.queryByRole('heading', { name: /datamodels/ });
    expect(dataModelHeading).not.toBeInTheDocument();
  });
});
