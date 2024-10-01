import React from 'react';
import { MemoryRouter, useParams } from 'react-router-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { PageLayout } from './PageLayout';

const mockedNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: jest.fn(),
  useNavigate: () => mockedNavigate,
}));

describe('PageLayout', () => {
  afterEach(jest.clearAllMocks);

  it('should show merge conflict modal when merge conflict message is received', async () => {
    (useParams as jest.Mock).mockReturnValue({
      org: 'ttd',
    });
    renderComponent();
    fireEvent(
      window,
      new MessageEvent('message', { data: 'forceRepoStatusCheck', origin: window.location.origin }),
    );

    await waitFor(() => {
      expect(screen.getByText(textMock('resourceadm.merge_conflict_header'))).toBeInTheDocument();
    });
  });

  it('should show merge conflict modal on load when repostatus return merge conflict', async () => {
    (useParams as jest.Mock).mockReturnValue({
      org: 'ttd',
    });
    renderComponent({
      getRepoStatus: jest.fn().mockImplementation(() =>
        Promise.resolve({
          aheadBy: 1,
          behindBy: 1,
          contentStatus: [],
          hasMergeConflict: true,
          repositoryStatus: 'Conflict',
        }),
      ),
    });

    await waitFor(() => {
      expect(screen.getByText(textMock('resourceadm.merge_conflict_header'))).toBeInTheDocument();
    });
  });

  it('should navigate to / if user does not have access to org', async () => {
    (useParams as jest.Mock).mockReturnValue({
      org: 'ikke-ttd',
    });
    renderComponent();
    await waitFor(() => {
      expect(mockedNavigate).toHaveBeenCalledWith('/');
    });
  });
});

const renderComponent = (queries: Partial<ServicesContextProps> = {}) => {
  const allQueries: ServicesContextProps = {
    ...queriesMock,
    ...queries,
    getOrganizations: jest.fn().mockImplementation(() =>
      Promise.resolve([
        {
          avatar_url: '',
          id: 'ttd',
          username: 'ttd',
        },
      ]),
    ),
  };

  return render(
    <MemoryRouter>
      <ServicesContextProvider {...allQueries} client={createQueryClientMock()}>
        <PageLayout />
      </ServicesContextProvider>
    </MemoryRouter>,
  );
};
