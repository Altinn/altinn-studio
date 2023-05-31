import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { VersionControlHeader } from './VersionControlHeader';
import { setWindowLocationForTests } from '../../../testing/testUtils';
import { ServicesContextProps, ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { textMock } from '../../../testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import type { RepoStatus } from 'app-shared/types/RepoStatus';
import { queriesMock } from 'app-shared/mocks/queriesMock';

const user = userEvent.setup();

setWindowLocationForTests('test-org', 'test-app');

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'), // use actual for all non-hook parts
  useParams: () => ({
    org: 'test-org',
    app: 'test-app',
  }),
}));

/**
 * This part is probably not ideal. A more scaleable way to mock these calls should be done in a more sentral place
 * for instance the `renderWithProviders` method.
 */
const okRepoStatus: RepoStatus = {
  aheadBy: 0,
  behindBy: 0,
  contentStatus: [],
  hasMergeConflict: false,
  repositoryStatus: 'Ok'
};
const getRepoMetadata = jest.fn().mockImplementation(() => Promise.resolve({}));
const getRepoStatus = jest.fn().mockImplementation(() => Promise.resolve(okRepoStatus));
const getRepoPull = jest.fn().mockImplementation(() => Promise.resolve(okRepoStatus));

const queries: ServicesContextProps = {
  ...queriesMock,
  getRepoMetadata,
  getRepoStatus,
  getRepoPull,
};

describe('Shared > Version Control > VersionControlHeader', () => {
  it('should render header when type is not defined', async () => {
    render(
      <ServicesContextProvider {...queries}>
        <VersionControlHeader hasPushRight={true} />
      </ServicesContextProvider>
    );
    await waitFor(() => expect(getRepoMetadata).toHaveBeenCalledTimes(1));
    expect(await screen.findByTestId('version-control-header')).not.toBeNull();
    expect(screen.queryByTestId('version-control-fetch-button')).toBeNull();
    expect(screen.queryByTestId('version-control-share-button')).toBeNull();
  });

  it('should render header when type is header', async () => {
    render(
      <ServicesContextProvider {...queries}>
        <VersionControlHeader hasPushRight={true} />
      </ServicesContextProvider>
    );
    await waitFor(() => expect(getRepoMetadata).toHaveBeenCalledTimes(1));
    // eslint-disable-next-line testing-library/prefer-presence-queries
    expect(screen.queryByTestId('version-control-header')).not.toBeNull();
    expect(screen.queryByTestId('version-control-fetch-button')).toBeNull();
    expect(screen.queryByTestId('version-control-share-button')).toBeNull();
  });

  it('Refetches queries when clicking the fetch button', async () => {
    render(
      <ServicesContextProvider {...queries}>
        <VersionControlHeader hasPushRight={true} />
      </ServicesContextProvider>
    );
    await waitFor(() => expect(getRepoMetadata).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(getRepoStatus).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(getRepoPull).toHaveBeenCalledTimes(1));
    const fetchButton = screen.getByRole('button', { name: textMock('sync_header.fetch_changes') });
    await act(() => user.click(fetchButton));
    await waitFor(() => expect(getRepoMetadata).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(getRepoStatus).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(getRepoPull).toHaveBeenCalledTimes(3)); // This is called twice because it is also refetched to check the repository status. See "todo" comment in the component file.
  });
});
