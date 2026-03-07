import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddPersonalAccessToken } from './AddPersonalAccessToken';
import { renderWithProviders } from '../../testing/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { PersonalAccessTokenResponse } from 'app-shared/types/api/PersonalAccessTokenResponse';
import type { CreatePersonalAccessTokenResponse } from 'app-shared/types/api/CreatePersonalAccessTokenResponse';
import { toast } from 'react-toastify';

jest.mock('react-toastify', () => ({
  ...jest.requireActual('react-toastify'),
  toast: { success: jest.fn(), error: jest.fn() },
}));

const todayUtc = new Date().toISOString().split('T')[0];

const validExpiresAt = (() => {
  const d = new Date(todayUtc);
  d.setUTCDate(d.getUTCDate() + 100);
  return d.toISOString().split('T')[0];
})();

const pastExpiresAt = (() => {
  const d = new Date(todayUtc);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().split('T')[0];
})();

const tooLongExpiresAt = (() => {
  const d = new Date(todayUtc);
  d.setUTCDate(d.getUTCDate() + 365);
  return d.toISOString().split('T')[0];
})();

const mockExistingTokens: PersonalAccessTokenResponse[] = [
  {
    id: 1,
    name: 'Existing token',
    expiresAt: '2099-01-01T00:00:00',
    createdAt: '2024-01-01T00:00:00',
  },
];

const mockCreatedToken: CreatePersonalAccessTokenResponse = {
  id: 2,
  key: 'secret-key-value',
  name: 'New token',
  expiresAt: validExpiresAt,
};

const onTokenCreated = jest.fn();

const renderAddPersonalAccessToken = (
  queries: Parameters<typeof renderWithProviders>[1]['queries'] = {},
) => {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.UserPersonalAccessTokens], mockExistingTokens);
  return renderWithProviders(<AddPersonalAccessToken onTokenCreated={onTokenCreated} />, {
    queryClient,
    queries,
  });
};

const getNameInput = () =>
  screen.getByLabelText(textMock('user.settings.personal_access_tokens.name'), { exact: false });

const getExpiryInput = () =>
  screen.getByLabelText(textMock('user.settings.personal_access_tokens.expires_at'), {
    exact: false,
  });

const getAddButton = () =>
  screen.getByRole('button', { name: textMock('user.settings.personal_access_tokens.add') });

const fillForm = async (user: ReturnType<typeof userEvent.setup>, name: string, date: string) => {
  await user.type(getNameInput(), name);
  await user.type(getExpiryInput(), date);
};

describe('AddPersonalAccessToken', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders the add form', () => {
    renderAddPersonalAccessToken();
    expect(getNameInput()).toBeInTheDocument();
    expect(getExpiryInput()).toBeInTheDocument();
    expect(getAddButton()).toBeInTheDocument();
  });

  it('sets min to today and max to 364 days from today on the expiry input', () => {
    const maxUtc = (() => {
      const d = new Date(todayUtc);
      d.setUTCDate(d.getUTCDate() + 364);
      return d.toISOString().split('T')[0];
    })();
    renderAddPersonalAccessToken();
    const expiryInput = getExpiryInput();
    expect(expiryInput).toHaveAttribute('min', todayUtc);
    expect(expiryInput).toHaveAttribute('max', maxUtc);
  });

  it('shows required error when submitting empty form', async () => {
    const user = userEvent.setup();
    renderAddPersonalAccessToken();
    await user.click(getAddButton());
    expect(screen.getAllByText(textMock('validation_errors.required'))).toHaveLength(2);
  });

  it('shows expiry too long error when expiry date exceeds 364 days', async () => {
    const user = userEvent.setup();
    renderAddPersonalAccessToken();
    await fillForm(user, 'New token', tooLongExpiresAt);
    await user.click(getAddButton());
    expect(
      screen.getByText(textMock('user.settings.personal_access_tokens.error_expiry_too_long')),
    ).toBeInTheDocument();
  });

  it('shows expiry in past error when expiry date is in the past', async () => {
    const user = userEvent.setup();
    renderAddPersonalAccessToken();
    await fillForm(user, 'New token', pastExpiresAt);
    await user.click(getAddButton());
    expect(
      screen.getByText(textMock('user.settings.personal_access_tokens.error_expiry_in_past')),
    ).toBeInTheDocument();
  });

  it('shows duplicate name error when name already exists', async () => {
    const user = userEvent.setup();
    renderAddPersonalAccessToken();
    await fillForm(user, 'Existing token', validExpiresAt);
    await user.click(getAddButton());
    expect(
      screen.getByText(textMock('user.settings.personal_access_tokens.error_duplicate_name')),
    ).toBeInTheDocument();
  });

  it('calls addUserPersonalAccessToken with correct payload', async () => {
    const user = userEvent.setup();
    const addUserPersonalAccessToken = jest.fn().mockResolvedValue(mockCreatedToken);
    renderAddPersonalAccessToken({ addUserPersonalAccessToken });
    await fillForm(user, 'New token', validExpiresAt);
    await user.click(getAddButton());
    expect(addUserPersonalAccessToken).toHaveBeenCalledWith({
      name: 'New token',
      expiresAt: `${validExpiresAt}T23:59:59Z`,
    });
  });

  it('shows the new token key after successful creation', async () => {
    const user = userEvent.setup();
    const addUserPersonalAccessToken = jest.fn().mockResolvedValue(mockCreatedToken);
    renderAddPersonalAccessToken({ addUserPersonalAccessToken });
    await fillForm(user, 'New token', validExpiresAt);
    await user.click(getAddButton());
    expect(await screen.findByDisplayValue('secret-key-value')).toBeInTheDocument();
  });

  it('calls onTokenCreated with the new token id after creation', async () => {
    const user = userEvent.setup();
    const addUserPersonalAccessToken = jest.fn().mockResolvedValue(mockCreatedToken);
    renderAddPersonalAccessToken({ addUserPersonalAccessToken });
    await fillForm(user, 'New token', validExpiresAt);
    await user.click(getAddButton());
    await screen.findByDisplayValue('secret-key-value');
    expect(onTokenCreated).toHaveBeenCalledWith(mockCreatedToken.id);
  });

  it('closes the token alert when close button is clicked', async () => {
    const user = userEvent.setup();
    const addUserPersonalAccessToken = jest.fn().mockResolvedValue(mockCreatedToken);
    renderAddPersonalAccessToken({ addUserPersonalAccessToken });
    await fillForm(user, 'New token', validExpiresAt);
    await user.click(getAddButton());
    await screen.findByDisplayValue('secret-key-value');
    await user.click(screen.getByRole('button', { name: textMock('general.close') }));
    expect(screen.queryByDisplayValue('secret-key-value')).not.toBeInTheDocument();
  });

  it('copies the token key to clipboard and shows success toast when copy button is clicked', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    jest.spyOn(navigator.clipboard, 'writeText').mockImplementation(writeText);
    const user = userEvent.setup();
    const addUserPersonalAccessToken = jest.fn().mockResolvedValue(mockCreatedToken);
    renderAddPersonalAccessToken({ addUserPersonalAccessToken });
    await fillForm(user, 'New token', validExpiresAt);
    await user.click(getAddButton());
    await screen.findByDisplayValue('secret-key-value');
    await user.click(
      screen.getByRole('button', {
        name: textMock('user.settings.personal_access_tokens.copy'),
      }),
    );
    expect(writeText).toHaveBeenCalledWith('secret-key-value');
    expect(toast.success).toHaveBeenCalledWith(
      textMock('user.settings.personal_access_tokens.copy_success'),
      expect.objectContaining({ toastId: 'user.settings.personal_access_tokens.copy_success' }),
    );
  });

  it('shows error toast when clipboard write fails', async () => {
    jest.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('Permission denied'));
    const user = userEvent.setup();
    const addUserPersonalAccessToken = jest.fn().mockResolvedValue(mockCreatedToken);
    renderAddPersonalAccessToken({ addUserPersonalAccessToken });
    await fillForm(user, 'New token', validExpiresAt);
    await user.click(getAddButton());
    await screen.findByDisplayValue('secret-key-value');
    await user.click(
      screen.getByRole('button', {
        name: textMock('user.settings.personal_access_tokens.copy'),
      }),
    );
    expect(toast.error).toHaveBeenCalledWith(
      textMock('user.settings.personal_access_tokens.copy_error'),
      expect.objectContaining({ toastId: 'user.settings.personal_access_tokens.copy_error' }),
    );
  });
});
