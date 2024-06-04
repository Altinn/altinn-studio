import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  DownloadRepoPopoverContent,
  type DownloadRepoPopoverContentProps,
} from './DownloadRepoPopoverContent';
import { MemoryRouter } from 'react-router-dom';
import { app, org } from '@studio/testing/testids';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { repoDownloadPath } from 'app-shared/api/paths';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => {
    return { org, app };
  },
}));

const mockOnClose = jest.fn();

const defaultProps: DownloadRepoPopoverContentProps = {
  onClose: mockOnClose,
};

describe('DownloadRepoPopoverContent', () => {
  afterEach(jest.clearAllMocks);

  it('renders links with correct hrefs', () => {
    renderDownloadRepoPopoverContent();

    expect(
      screen.getByRole('link', { name: textMock('overview.download_repo_changes') }),
    ).toHaveAttribute('href', repoDownloadPath(org, app));

    expect(
      screen.getByRole('link', { name: textMock('overview.download_repo_full') }),
    ).toHaveAttribute('href', repoDownloadPath(org, app, true));
  });

  it('calls onClose function when cancel button is clicked', async () => {
    const user = userEvent.setup();
    renderDownloadRepoPopoverContent();

    const cancelButton = screen.getByRole('button', { name: textMock('general.cancel') });
    await user.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });
});

const renderDownloadRepoPopoverContent = () => {
  return render(
    <MemoryRouter>
      <DownloadRepoPopoverContent {...defaultProps} />
    </MemoryRouter>,
  );
};
