import React from 'react';
import { FetchChangesPopover } from './FetchChangesPopover';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import {
  VersionControlButtonsContext,
  type VersionControlButtonsContextProps,
} from '../../context';
import { mockVersionControlButtonsContextValue } from '../../test/mocks/versionControlContextMock';
import { useMediaQuery } from 'libs/studio-components-legacy/src';
import { renderWithProviders } from '../../../mocks/renderWithProviders';
import { app, org } from '@studio/testing/testids';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';

jest.mock('libs/studio-components-legacy/src/hooks/useMediaQuery');

const mockGetRepoPull = jest.fn();

describe('fetchChanges', () => {
  afterEach(jest.clearAllMocks);

  it('should call invalidateQueries with correct predicate when fetching changes successfully', async () => {
    const user = userEvent.setup();
    const mockInvalidateQueries = jest.fn();
    mockGetRepoPull.mockImplementation(() =>
      Promise.resolve({ repositoryStatus: 'Ok', hasMergeConflict: false }),
    );
    renderFetchChangesPopover({
      queries: { getRepoPull: mockGetRepoPull },
      versionControlButtonsContextProps: {
        ...mockVersionControlButtonsContextValue,
      },
      invalidateQueries: mockInvalidateQueries,
    });
    const fetchButton = screen.getByRole('button', { name: textMock('sync_header.fetch_changes') });
    await user.click(fetchButton);
    await waitFor(() => {
      expect(mockInvalidateQueries).toHaveBeenCalledTimes(1);
    });
    const predicate = mockInvalidateQueries.mock.calls[0][0].predicate;
    expect(predicate({ queryKey: [org, app, 'RepoStatus'] })).toBe(true);
  });

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
    const mockInvalidateQueries = jest.fn();
    const getRepoPull = mockGetRepoPull.mockImplementation(() =>
      Promise.resolve({ repositoryStatus: 'Ok' }),
    );
    renderFetchChangesPopover({
      queries: { getRepoPull },
      invalidateQueries: mockInvalidateQueries,
    });

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

  it('should render the button with text on a large screen', () => {
    renderFetchChangesPopover();

    expect(screen.getByText(textMock('sync_header.fetch_changes'))).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: textMock('sync_header.fetch_changes') }),
    ).toBeInTheDocument();
  });

  it('should not render the button text on a small screen', () => {
    (useMediaQuery as jest.Mock).mockReturnValue(true);
    renderFetchChangesPopover();

    expect(screen.queryByText(textMock('sync_header.fetch_changes'))).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: textMock('sync_header.fetch_changes') }),
    ).toBeInTheDocument();
  });
});

type Props = {
  queries?: Partial<ServicesContextProps>;
  versionControlButtonsContextProps?: Partial<VersionControlButtonsContextProps>;
  invalidateQueries?: jest.Mock;
};

const renderFetchChangesPopover = (props: Partial<Props> = {}) => {
  const { queries, versionControlButtonsContextProps, invalidateQueries } = props;
  const queryClient = createQueryClientMock();
  queryClient.invalidateQueries = invalidateQueries;

  return renderWithProviders(
    { ...queries },
    queryClient,
  )(
    <VersionControlButtonsContext.Provider
      value={{ ...mockVersionControlButtonsContextValue, ...versionControlButtonsContextProps }}
    >
      <FetchChangesPopover />
    </VersionControlButtonsContext.Provider>,
  );
};
