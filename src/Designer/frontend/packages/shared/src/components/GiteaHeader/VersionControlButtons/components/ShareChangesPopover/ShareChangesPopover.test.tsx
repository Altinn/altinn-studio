import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { ShareChangesPopover } from './ShareChangesPopover';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import {
  VersionControlButtonsContext,
  type VersionControlButtonsContextProps,
} from '../../context';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { mockVersionControlButtonsContextValue } from '../../test/mocks/versionControlContextMock';
import { app, org } from '@studio/testing/testids';
import { QueryKey } from 'app-shared/types/QueryKey';
import { repository } from 'app-shared/mocks/mocks';
import { useMediaQuery } from '@studio/components-legacy';
import { renderWithProviders } from '../../../mocks/renderWithProviders';

jest.mock('@studio/components-legacy/hooks/useMediaQuery');

const mockGetRepoStatus = jest.fn();

describe('shareChanges', () => {
  beforeEach(jest.clearAllMocks);

  it('should call "getRepoStatus" when clicking the share changes button', async () => {
    const user = userEvent.setup();

    const getRepoStatus = mockGetRepoStatus.mockImplementation(() =>
      Promise.resolve({
        contentStatus: [{ filePath: '', fileStatus: 'Modified' }],
        aheadBy: 1,
        behindBy: 0,
        hasMergeConflict: false,
        repositoryStatus: 'Ok',
      }),
    );

    renderShareChangesPopover({
      queries: { getRepoStatus },
      versionControlButtonsContextProps: {
        ...mockVersionControlButtonsContextValue,
        hasPushRights: true,
      },
    });

    const shareButton = screen.getByRole('button', {
      name: textMock('sync_header.changes_to_share'),
    });
    await user.click(shareButton);

    await waitFor(() =>
      expect(
        screen.getByRole('heading', {
          level: 3,
          name: textMock('sync_header.describe_and_validate'),
        }),
      ),
    );

    // One call is made when the component is rendered and another when the button is clicked
    expect(getRepoStatus).toHaveBeenCalledTimes(2);
  });

  it('should display no changes to share message when there are no local changes or aheadBy is 0', async () => {
    const user = userEvent.setup();

    const getRepoStatus = mockGetRepoStatus.mockImplementation(() =>
      Promise.resolve({
        contentStatus: [{ filePath: '', fileStatus: 'Ignored' }],
        aheadBy: 0,
        behindBy: 0,
        hasMergeConflict: false,
        repositoryStatus: 'Ok',
      }),
    );

    renderShareChangesPopover({
      queries: { getRepoStatus },
      versionControlButtonsContextProps: {
        ...mockVersionControlButtonsContextValue,
        hasPushRights: true,
      },
    });

    const shareButton = screen.getByRole('button', {
      name: textMock('sync_header.changes_to_share'),
    });
    await user.click(shareButton);

    await waitFor(() =>
      expect(
        screen.getByRole('heading', {
          level: 3,
          name: textMock('sync_header.nothing_to_push'),
        }),
      ),
    );
  });

  it('should render notificationIcon when there are no merge conflicts', () => {
    renderShareChangesPopover({
      versionControlButtonsContextProps: {
        ...mockVersionControlButtonsContextValue,
        repoStatus: {
          ...mockVersionControlButtonsContextValue.repoStatus,
          contentStatus: [{ filePath: '', fileStatus: '' }],
        },
      },
    });
    const notificationIcon = screen.getByLabelText('sync_header.notification_label');

    expect(notificationIcon).toBeInTheDocument();
  });

  it('should render share changes button as disabled when there are merge conflicts', () => {
    renderShareChangesPopover({
      versionControlButtonsContextProps: {
        ...mockVersionControlButtonsContextValue,
        repoStatus: {
          ...mockVersionControlButtonsContextValue.repoStatus,
          contentStatus: [{ filePath: '', fileStatus: '' }],
        },
        hasMergeConflict: true,
      },
    });

    const shareButton = screen.getByRole('button', {
      name: textMock('sync_header.changes_to_share'),
    });

    expect(shareButton).toHaveAttribute('disabled');
  });

  it('should render share changes button as disabled when hasPushRight is false', () => {
    renderShareChangesPopover({
      versionControlButtonsContextProps: {
        ...mockVersionControlButtonsContextValue,
        hasPushRights: false,
      },
    });

    const shareButton = screen.getByRole('button', {
      name: textMock('sync_header.changes_to_share'),
    });

    expect(shareButton).toHaveAttribute('disabled');
  });

  it('should display "changes to share" message when there are local changes or aheadBy is greater than 0', async () => {
    const user = userEvent.setup();

    const getRepoStatus = mockGetRepoStatus.mockImplementation(() =>
      Promise.resolve({
        contentStatus: [{ filePath: '', fileStatus: 'Modified' }],
        aheadBy: 1,
        behindBy: 0,
        hasMergeConflict: false,
        repositoryStatus: 'Ok',
      }),
    );
    renderShareChangesPopover({ queries: { getRepoStatus } });

    const shareButton = screen.getByRole('button', {
      name: textMock('sync_header.changes_to_share'),
    });
    await user.click(shareButton);

    await waitFor(() => expect(getRepoStatus).toHaveBeenCalled());
    await waitFor(() =>
      expect(
        screen.queryByText(textMock('sync_header.controlling_service_status')),
      ).not.toBeInTheDocument(),
    );
    expect(screen.queryByText(textMock('sync_header.nothing_to_push'))).not.toBeInTheDocument();
    expect(screen.getByText(textMock('sync_header.changes_to_share'))).toBeInTheDocument();
  });

  it('should render the button with text on a large screen', () => {
    renderShareChangesPopover();

    expect(screen.getByText(textMock('sync_header.changes_to_share'))).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: textMock('sync_header.changes_to_share') }),
    ).toBeInTheDocument();
  });

  it('should not render the button text on a small screen', () => {
    (useMediaQuery as jest.Mock).mockReturnValue(true);
    renderShareChangesPopover();

    expect(screen.queryByText(textMock('sync_header.changes_to_share'))).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: textMock('sync_header.changes_to_share') }),
    ).toBeInTheDocument();
  });
});

type Props = {
  queries: Partial<ServicesContextProps>;
  versionControlButtonsContextProps: Partial<VersionControlButtonsContextProps>;
};

const renderShareChangesPopover = (props: Partial<Props> = {}) => {
  const { queries, versionControlButtonsContextProps } = props;

  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.RepoMetadata, org, app], {
    ...repository,
    permissions: { ...repository.permissions, push: true },
  });

  return renderWithProviders(
    { ...queriesMock, ...queries },
    queryClient,
  )(
    <VersionControlButtonsContext.Provider
      value={{ ...mockVersionControlButtonsContextValue, ...versionControlButtonsContextProps }}
    >
      <ShareChangesPopover />
    </VersionControlButtonsContext.Provider>,
  );
};
