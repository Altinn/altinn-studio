import React from 'react';
import { screen, waitForElementToBeRemoved } from '@testing-library/react';
import { renderWithProviders } from '../../../../testing/mocks';
import { SubHeader } from './SubHeader';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { HeaderContextProvider } from '../../../../context/HeaderContext';
import { headerContextValueMock } from '../../../../testing/headerContextMock';
import { repoStatus } from 'app-shared/mocks/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { useParams } from 'react-router-dom';
import { SelectedContextType } from '../../../../enums/SelectedContextType';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: jest.fn().mockReturnValue({
    subroute: 'org-library',
    selectedContext: 'ttd',
  }),
  useLocation: jest.fn().mockReturnValue({ pathname: 'app-dashboard/self' }),
}));

describe('SubHeader', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('initially shows the spinner', () => {
    renderSubHeader();
    expect(screen.getByTitle(textMock('general.loading'))).toBeInTheDocument();
  });

  it('renders GiteaHeader when orgRepoName is defined and no merge conflict', async () => {
    const getRepoStatus = jest
      .fn()
      .mockImplementation(() => Promise.resolve({ ...repoStatus, hasMergeConflict: false }));

    renderSubHeader({ getRepoStatus });
    await waitForLoadingToComplete();

    const anElementInGiteaHeader = screen.getByTitle(textMock('sync_header.gitea_menu'));
    expect(anElementInGiteaHeader).toBeInTheDocument();
  });

  it('does not render GiteaHeader when orgRepoName is not defined and no merge conflict', async () => {
    (useParams as jest.Mock).mockReturnValue({
      selectedContext: SelectedContextType.Self,
    });

    const getRepoStatus = jest
      .fn()
      .mockImplementation(() => Promise.resolve({ ...repoStatus, hasMergeConflict: false }));

    renderSubHeader({ getRepoStatus });
    await waitForLoadingToComplete();

    const anElementInGiteaHeader = screen.queryByTitle(textMock('sync_header.gitea_menu'));
    expect(anElementInGiteaHeader).not.toBeInTheDocument();
  });

  it('does not render GiteaHeader when there is a merge conflict', async () => {
    const getRepoStatus = jest
      .fn()
      .mockImplementation(() => Promise.resolve({ ...repoStatus, hasMergeConflict: true }));

    renderSubHeader({ getRepoStatus });
    await waitForLoadingToComplete();

    const anElementInGiteaHeader = screen.queryByTitle(textMock('sync_header.gitea_menu'));
    expect(anElementInGiteaHeader).not.toBeInTheDocument();
  });

  it('passes hasRepoError as true when there is a repo status error', async () => {
    const getRepoStatus = jest
      .fn()
      .mockImplementation(() => Promise.reject(new Error('An error occurred')));

    renderSubHeader({ getRepoStatus });
    await waitForLoadingToComplete();

    const anElementInGiteaHeader = screen.queryByTitle(textMock('sync_header.gitea_menu'));
    expect(anElementInGiteaHeader).not.toBeInTheDocument();
  });
});

const renderSubHeader = (queries: Partial<ServicesContextProps> = {}) => {
  const allQueries = { ...queries, queriesMock };

  return renderWithProviders(
    <HeaderContextProvider {...headerContextValueMock}>
      <SubHeader />
    </HeaderContextProvider>,
    {
      queries: allQueries,
    },
  );
};

const waitForLoadingToComplete = async () => {
  await waitForElementToBeRemoved(() => screen.queryByText(textMock('general.loading')));
};
