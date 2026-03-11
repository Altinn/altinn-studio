import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiKeysList } from './ApiKeysList';
import { renderWithProviders } from '../../testing/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { UserApiKeyResponse } from 'app-shared/types/api/UserApiKeyResponse';
import { queriesMock } from 'app-shared/mocks/queriesMock';

const mockTokens: UserApiKeyResponse[] = [
  {
    id: 1,
    name: 'My token',
    expiresAt: '2099-01-01T00:00:00',
    createdAt: '2024-01-01T00:00:00',
  },
  {
    id: 2,
    name: 'Expired token',
    expiresAt: '2000-01-01T00:00:00',
    createdAt: '2023-01-01T00:00:00',
  },
];

const renderApiKeysList = (
  newTokenId: number | null = null,
  queries: Parameters<typeof renderWithProviders>[1]['queries'] = {},
) => {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.UserApiKeys], mockTokens);
  return renderWithProviders(<ApiKeysList newTokenId={newTokenId} />, {
    queryClient,
    queries,
  });
};

describe('ApiKeysList', () => {
  it('renders loading spinner while fetching', () => {
    renderWithProviders(<ApiKeysList newTokenId={null} />, {
      queries: { getUserApiKeys: jest.fn().mockReturnValue(new Promise(() => {})) },
    });
    expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument();
  });

  it('renders error message on fetch error', async () => {
    renderWithProviders(<ApiKeysList newTokenId={null} />, {
      queries: {
        getUserApiKeys: jest.fn().mockRejectedValue(new Error('fetch error')),
      },
    });
    expect(await screen.findByText(textMock('user.settings.api_keys.error'))).toBeInTheDocument();
  });

  it('renders empty state message when there are no tokens', () => {
    const queryClient = createQueryClientMock();
    queryClient.setQueryData([QueryKey.UserApiKeys], []);
    renderWithProviders(<ApiKeysList newTokenId={null} />, { queryClient });
    expect(screen.getByText(textMock('user.settings.api_keys.no_tokens'))).toBeInTheDocument();
  });

  it('renders the list of tokens', () => {
    renderApiKeysList();
    expect(screen.getByText('My token')).toBeInTheDocument();
    expect(screen.getByText('Expired token')).toBeInTheDocument();
  });

  it('shows expired tag for tokens past their expiry date', () => {
    renderApiKeysList();
    expect(screen.getByText(textMock('user.settings.api_keys.expired'))).toBeInTheDocument();
  });

  it('does not show expired tag for valid tokens', () => {
    const queryClient = createQueryClientMock();
    queryClient.setQueryData([QueryKey.UserApiKeys], [mockTokens[0]]);
    renderWithProviders(<ApiKeysList newTokenId={null} />, { queryClient });
    expect(screen.queryByText(textMock('user.settings.api_keys.expired'))).not.toBeInTheDocument();
  });

  it('calls deleteUserApiKey when delete button is clicked and confirmed', async () => {
    const user = userEvent.setup();
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    renderApiKeysList();

    const deleteButtons = screen.getAllByRole('button', {
      name: textMock('user.settings.api_keys.delete'),
    });
    await user.click(deleteButtons[0]);

    expect(queriesMock.deleteUserApiKey).toHaveBeenCalled();
    jest.restoreAllMocks();
  });

  it('disables the delete button for the token currently being deleted', async () => {
    const user = userEvent.setup();
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    renderApiKeysList(null, {
      deleteUserApiKey: jest.fn().mockReturnValue(new Promise(() => {})),
    });

    const deleteButtons = screen.getAllByRole('button', {
      name: textMock('user.settings.api_keys.delete'),
    });
    await user.click(deleteButtons[0]);

    expect(deleteButtons[0]).toBeDisabled();
    jest.restoreAllMocks();
  });
});
