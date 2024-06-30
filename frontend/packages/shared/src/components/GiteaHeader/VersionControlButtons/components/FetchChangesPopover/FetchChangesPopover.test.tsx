import React from 'react';
import { FetchChangesPopover } from './FetchChangesPopover';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import {
  type ServicesContextProps,
  ServicesContextProvider,
} from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import {
  VersionControlButtonsContext,
  type VersionControlButtonsContextProps,
} from '../../context';
import { mockVersionControlButtonsContextValue } from '../../test/mocks/versionControlContextMock';

const mockGetRepoPull = jest.fn();

describe('fetchChanges', () => {
  afterEach(jest.clearAllMocks);

  it('should call "getPullRepo"" when clicking sync button', async () => {
    const user = userEvent.setup();

    const getRepoPull = mockGetRepoPull.mockImplementation(() => Promise.resolve({}));
    renderFetchChangesPopover({ queries: { getRepoPull } });

    const fetchButton = screen.getByRole('button', { name: textMock('sync_header.fetch_changes') });
    await user.click(fetchButton);
    expect(getRepoPull).toHaveBeenCalledTimes(1);
  });

  it('should render number of changes when displayNotification is true and there are no merge conflicts', () => {
    const numberOfChanges = 123;
    renderFetchChangesPopover({
      versionControlButtonsContextProps: {
        ...mockVersionControlButtonsContextValue,
        repoStatus: {
          ...mockVersionControlButtonsContextValue.repoStatus,
          behindBy: numberOfChanges,
        },
      },
    });

    const fetchButton = screen.getByRole('button', {
      name: textMock('sync_header.fetch_changes'),
    });
    expect(fetchButton).toHaveTextContent(textMock('sync_header.fetch_changes') + numberOfChanges);
  });

  it('should not render number of changes when displayNotification is true and there are merge conflicts', () => {
    const numberOfChanges = 123;
    renderFetchChangesPopover({
      versionControlButtonsContextProps: {
        ...mockVersionControlButtonsContextValue,
        repoStatus: {
          ...mockVersionControlButtonsContextValue.repoStatus,
          behindBy: numberOfChanges,
        },
        hasMergeConflict: true,
      },
    });

    const fetchButton = screen.getByRole('button', {
      name: textMock('sync_header.fetch_changes'),
    });

    expect(fetchButton).not.toHaveTextContent(
      textMock('sync_header.fetch_changes') + numberOfChanges,
    );
  });

  it('should render fetch changes button as disabled when there are merge conflicts', () => {
    renderFetchChangesPopover({
      versionControlButtonsContextProps: {
        hasMergeConflict: true,
      },
    });

    const fetchButton = screen.getByRole('button', {
      name: textMock('sync_header.fetch_changes'),
    });

    expect(fetchButton).toHaveAttribute('disabled');
  });

  it('should call onPullSuccess when fetching changes', async () => {
    const user = userEvent.setup();

    const getRepoPull = mockGetRepoPull.mockImplementation(() =>
      Promise.resolve({ repositoryStatus: 'Ok' }),
    );
    renderFetchChangesPopover({ queries: { getRepoPull } });

    const fetchButton = screen.getByRole('button', { name: textMock('sync_header.fetch_changes') });
    await user.click(fetchButton);

    expect(mockVersionControlButtonsContextValue.onPullSuccess).toHaveBeenCalledTimes(1);
  });

  it('should call commitAndPushChanges and close popover when there is a merge conflict or checkout conflict', async () => {
    const user = userEvent.setup();

    const getRepoPull = mockGetRepoPull.mockImplementation(() =>
      Promise.resolve({ repositoryStatus: 'CheckoutConflict' }),
    );

    renderFetchChangesPopover({
      queries: { getRepoPull },
      versionControlButtonsContextProps: {
        ...mockVersionControlButtonsContextValue,
        hasPushRights: true,
      },
    });

    const fetchButton = screen.getByRole('button', { name: textMock('sync_header.fetch_changes') });
    await user.click(fetchButton);

    await waitFor(() => {
      expect(mockVersionControlButtonsContextValue.commitAndPushChanges).toHaveBeenCalledWith('');
    });
  });
});

type Props = {
  queries: Partial<ServicesContextProps>;
  versionControlButtonsContextProps: Partial<VersionControlButtonsContextProps>;
};

const renderFetchChangesPopover = (props: Partial<Props> = {}) => {
  const { queries, versionControlButtonsContextProps } = props;

  const allQueries: ServicesContextProps = {
    ...queriesMock,
    ...queries,
  };

  return render(
    <ServicesContextProvider {...allQueries} client={createQueryClientMock()}>
      <VersionControlButtonsContext.Provider
        value={{ ...mockVersionControlButtonsContextValue, ...versionControlButtonsContextProps }}
      >
        <FetchChangesPopover />
      </VersionControlButtonsContext.Provider>
    </ServicesContextProvider>,
  );
};
