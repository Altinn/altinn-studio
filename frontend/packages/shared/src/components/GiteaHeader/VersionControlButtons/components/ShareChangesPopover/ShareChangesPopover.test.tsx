import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { ShareChangesPopover } from './ShareChangesPopover';
import {
  type ServicesContextProps,
  ServicesContextProvider,
} from 'app-shared/contexts/ServicesContext';
import {
  VersionControlButtonsContext,
  type VersionControlButtonsContextProps,
} from '../../context';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { mockVersionControlButtonsContextValue } from '../../test/mocks/versionControlContextMock';
import { MemoryRouter } from 'react-router-dom';
import { app, org } from '@studio/testing/testids';
import { QueryKey } from 'app-shared/types/QueryKey';
import { repository } from 'app-shared/mocks/mocks';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => {
    return { org, app };
  },
}));

const mockGetRepoStatus = jest.fn();

describe('shareChanges', () => {
  beforeEach(jest.clearAllMocks);

  it('should call "getRepoStatus" when clicking the share changes button', async () => {
    const user = userEvent.setup();

    const getRepoStatus = mockGetRepoStatus.mockImplementation(() => Promise.resolve({}));
    renderShareChangesPopover({ queries: { getRepoStatus } });

    const shareButton = screen.getByRole('button', {
      name: textMock('sync_header.changes_to_share'),
    });
    await user.click(shareButton);

    expect(getRepoStatus).toHaveBeenCalled();
  });

  it('should render number of changes when displayNotification is true and there are no merge conflicts', () => {
    renderShareChangesPopover({
      versionControlButtonsContextProps: {
        ...mockVersionControlButtonsContextValue,
        repoStatus: {
          ...mockVersionControlButtonsContextValue.repoStatus,
          contentStatus: [{ filePath: '', fileStatus: '' }],
        },
      },
    });

    const shareButton = screen.getByRole('button', {
      name: textMock('sync_header.changes_to_share'),
    });

    expect(shareButton).toHaveTextContent(textMock('sync_header.changes_to_share') + 1);
  });

  it('should not render number of changes when displayNotification is true and there are merge conflicts', () => {
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
      name: textMock('sync_header.merge_conflict'),
    });

    expect(shareButton).not.toHaveTextContent(textMock('sync_header.merge_conflict') + 1);
  });

  it('should render merge conflict button as disabled when there are merge conflicts', () => {
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
      name: textMock('sync_header.merge_conflict'),
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

  const allQueries: ServicesContextProps = {
    ...queriesMock,
    ...queries,
  };

  return render(
    <MemoryRouter>
      <ServicesContextProvider {...allQueries} client={queryClient}>
        <VersionControlButtonsContext.Provider
          value={{ ...mockVersionControlButtonsContextValue, ...versionControlButtonsContextProps }}
        >
          <ShareChangesPopover />
        </VersionControlButtonsContext.Provider>
      </ServicesContextProvider>
    </MemoryRouter>,
  );
};
