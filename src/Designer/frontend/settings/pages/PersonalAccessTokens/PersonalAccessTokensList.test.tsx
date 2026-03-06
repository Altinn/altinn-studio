import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PersonalAccessTokensList } from './PersonalAccessTokensList';
import { renderWithProviders } from '../../testing/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { PersonalAccessTokenResponse } from 'app-shared/types/api/PersonalAccessTokenResponse';
import { queriesMock } from 'app-shared/mocks/queriesMock';

const mockTokens: PersonalAccessTokenResponse[] = [
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

const renderPersonalAccessTokensList = (
  newTokenId: number | null = null,
  queries: Parameters<typeof renderWithProviders>[1]['queries'] = {},
) => {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.UserPersonalAccessTokens], mockTokens);
  return renderWithProviders(<PersonalAccessTokensList newTokenId={newTokenId} />, {
    queryClient,
    queries,
  });
};

describe('PersonalAccessTokensList', () => {
  it('renders loading spinner while fetching', () => {
    renderWithProviders(<PersonalAccessTokensList newTokenId={null} />, {
      queries: { getUserPersonalAccessTokens: jest.fn().mockReturnValue(new Promise(() => {})) },
    });
    expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument();
  });

  it('renders error message on fetch error', async () => {
    renderWithProviders(<PersonalAccessTokensList newTokenId={null} />, {
      queries: {
        getUserPersonalAccessTokens: jest.fn().mockRejectedValue(new Error('fetch error')),
      },
    });
    expect(
      await screen.findByText(textMock('user.settings.personal_access_tokens.error')),
    ).toBeInTheDocument();
  });

  it('renders empty state message when there are no tokens', () => {
    const queryClient = createQueryClientMock();
    queryClient.setQueryData([QueryKey.UserPersonalAccessTokens], []);
    renderWithProviders(<PersonalAccessTokensList newTokenId={null} />, { queryClient });
    expect(
      screen.getByText(textMock('user.settings.personal_access_tokens.no_tokens')),
    ).toBeInTheDocument();
  });

  it('renders the list of tokens', () => {
    renderPersonalAccessTokensList();
    expect(screen.getByText('My token')).toBeInTheDocument();
    expect(screen.getByText('Expired token')).toBeInTheDocument();
  });

  it('shows expired tag for tokens past their expiry date', () => {
    renderPersonalAccessTokensList();
    expect(
      screen.getByText(textMock('user.settings.personal_access_tokens.expired')),
    ).toBeInTheDocument();
  });

  it('does not show expired tag for valid tokens', () => {
    const queryClient = createQueryClientMock();
    queryClient.setQueryData([QueryKey.UserPersonalAccessTokens], [mockTokens[0]]);
    renderWithProviders(<PersonalAccessTokensList newTokenId={null} />, { queryClient });
    expect(
      screen.queryByText(textMock('user.settings.personal_access_tokens.expired')),
    ).not.toBeInTheDocument();
  });

  it('calls deleteUserPersonalAccessToken when delete button is clicked and confirmed', async () => {
    const user = userEvent.setup();
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    renderPersonalAccessTokensList();

    const deleteButtons = screen.getAllByRole('button', {
      name: textMock('user.settings.personal_access_tokens.delete'),
    });
    await user.click(deleteButtons[0]);

    expect(queriesMock.deleteUserPersonalAccessToken).toHaveBeenCalled();
    jest.restoreAllMocks();
  });

  it('disables the delete button for the token currently being deleted', async () => {
    const user = userEvent.setup();
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    renderPersonalAccessTokensList(null, {
      deleteUserPersonalAccessToken: jest.fn().mockReturnValue(new Promise(() => {})),
    });

    const deleteButtons = screen.getAllByRole('button', {
      name: textMock('user.settings.personal_access_tokens.delete'),
    });
    await user.click(deleteButtons[0]);

    expect(deleteButtons[0]).toBeDisabled();
    jest.restoreAllMocks();
  });
});
