import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MergeConflictWarning, type MergeConflictWarningProps } from './MergeConflictWarning';
import { MemoryRouter } from 'react-router-dom';
import { org, app } from '@studio/testing/testids';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import { repoDownloadPath } from 'app-shared/api/paths';
import {
  type ServicesContextProps,
  ServicesContextProvider,
} from 'app-shared/contexts/ServicesContext';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';

const startUrl: string = `${APP_DEVELOPMENT_BASENAME}/test-org/test-app`;

jest.mock('react-router-dom', () => jest.requireActual('react-router-dom'));

describe('MergeConflictWarning', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render merge conflict warning container', () => {
    renderMergeConflictWarning();
    const container = screen.getByRole('dialog');
    expect(container).toBeInTheDocument();
  });

  it('should render download links with correct URLs', () => {
    renderMergeConflictWarning();

    const zipLink = screen.getByRole('link', {
      name: textMock('overview.download_repo_changes'),
    });
    expect(zipLink).toHaveAttribute('href', repoDownloadPath(org, app));

    const fullRepoLink = screen.getByRole('link', {
      name: textMock('overview.download_repo_full'),
    });
    expect(fullRepoLink).toHaveAttribute('href', repoDownloadPath(org, app, true));
  });

  it('should open and close popover when clicking the delete button', async () => {
    const user = userEvent.setup();
    renderMergeConflictWarning();

    const deleteButton = screen.getByRole('button', {
      name: textMock('merge_conflict.remove_my_changes'),
    });

    expect(getHeadingInDeletePopover()).not.toBeInTheDocument();

    await user.click(deleteButton);
    expect(getHeadingInDeletePopover()).toBeInTheDocument();

    await user.click(deleteButton);
    expect(getHeadingInDeletePopover()).not.toBeInTheDocument();
  });

  it('should close the popover when clicking cancel', async () => {
    const user = userEvent.setup();
    renderMergeConflictWarning();

    const openPopoverButton = screen.getByRole('button', {
      name: textMock('merge_conflict.remove_my_changes'),
    });

    await user.click(openPopoverButton);
    expect(getHeadingInDeletePopover()).toBeInTheDocument();

    const cancelButton = screen.getByRole('button', {
      name: textMock('general.cancel'),
    });
    await user.click(cancelButton);

    expect(getHeadingInDeletePopover()).not.toBeInTheDocument();
  });
});

const defaultProps: MergeConflictWarningProps = {
  owner: org,
  repoName: app,
};

const renderMergeConflictWarning = (queries: Partial<ServicesContextProps> = {}) => {
  return render(
    <ServicesContextProvider {...queriesMock} {...queries} client={createQueryClientMock()}>
      <MemoryRouter initialEntries={[startUrl]}>
        <MergeConflictWarning {...defaultProps} />
      </MemoryRouter>
    </ServicesContextProvider>,
  );
};

function getHeadingInDeletePopover() {
  return screen.queryByRole('heading', {
    name: textMock('overview.reset_repo_confirm_heading'),
    level: 2,
  });
}
