import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  RemoveChangesPopoverContent,
  type RemoveChangesPopoverContentProps,
} from './RemoveChangesPopoverContent';
import { MemoryRouter } from 'react-router-dom';
import { app, org } from '@studio/testing/testids';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { QueryClient } from '@tanstack/react-query';
import {
  ServicesContextProvider,
  type ServicesContextProps,
} from 'app-shared/contexts/ServicesContext';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';

jest.mock('react-router-dom', () => jest.requireActual('react-router-dom'));

const resetRepoChanges = jest.fn().mockImplementation(() => Promise.resolve({}));

const mockOnClose = jest.fn();

const mockLocationReload = () => {
  Object.defineProperty(window, 'location', {
    value: {
      ...window.location,
      reload: jest.fn(),
    },
    writable: true,
  });
  return jest.spyOn(window.location, 'reload').mockImplementation(() => {});
};

const defaultProps: RemoveChangesPopoverContentProps = {
  onClose: mockOnClose,
  owner: org,
  repoName: app,
};

describe('DownloadRepoPopoverContent', () => {
  afterEach(jest.clearAllMocks);

  it('enables the confirm button when the correct app name is typed', async () => {
    const user = userEvent.setup();
    renderRemoveChangesPopoverContent();

    const input = screen.getByLabelText(textMock('overview.reset_repo_confirm_repo_name'));
    const confirmButton = screen.getByRole('button', {
      name: textMock('overview.reset_repo_button'),
    });

    expect(confirmButton).toBeDisabled();

    await user.type(input, app);

    expect(confirmButton).toBeEnabled();
  });

  it('calls onResetWrapper and then full refresh of page when the confirm button is clicked', async () => {
    const user = userEvent.setup();
    mockLocationReload();
    renderRemoveChangesPopoverContent();

    const input = screen.getByLabelText(textMock('overview.reset_repo_confirm_repo_name'));
    const confirmButton = screen.getByRole('button', {
      name: textMock('overview.reset_repo_button'),
    });

    await user.type(input, app);
    await user.click(confirmButton);

    expect(resetRepoChanges).toHaveBeenCalledTimes(1);
    expect(location.reload).toHaveBeenCalledTimes(1);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose function when cancel button is clicked', async () => {
    const user = userEvent.setup();
    renderRemoveChangesPopoverContent();

    const cancelButton = screen.getByRole('button', { name: textMock('general.cancel') });
    await user.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onResetWrapper and then full refresh of page when Enter is pressed', async () => {
    const user = userEvent.setup();
    mockLocationReload();
    renderRemoveChangesPopoverContent();

    const input = screen.getByLabelText(textMock('overview.reset_repo_confirm_repo_name'));
    await user.type(input, app);
    await user.keyboard('{Enter}');

    expect(resetRepoChanges).toHaveBeenCalledTimes(1);
    expect(location.reload).toHaveBeenCalledTimes(1);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});

const renderRemoveChangesPopoverContent = (
  queries: Partial<ServicesContextProps> = {},
  queryClient: QueryClient = createQueryClientMock(),
) => {
  const allQueries: ServicesContextProps = {
    resetRepoChanges,
    ...queries,
  };

  return render(
    <MemoryRouter>
      <ServicesContextProvider {...allQueries} client={queryClient}>
        <RemoveChangesPopoverContent {...defaultProps} />
      </ServicesContextProvider>
    </MemoryRouter>,
  );
};
