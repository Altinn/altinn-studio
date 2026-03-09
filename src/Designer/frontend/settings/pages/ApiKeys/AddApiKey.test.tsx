import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddApiKey } from './AddApiKey';
import { renderWithProviders } from '../../testing/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { ApiKeyResponse } from 'app-shared/types/api/ApiKeyResponse';
import type { CreateApiKeyResponse } from 'app-shared/types/api/CreateApiKeyResponse';
import { toast } from 'react-toastify';
import { ApiErrorCodes } from 'app-shared/enums/ApiErrorCodes';

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
  d.setUTCDate(d.getUTCDate() + 366);
  return d.toISOString().split('T')[0];
})();

const mockExistingTokens: ApiKeyResponse[] = [
  {
    id: 1,
    name: 'Existing token',
    expiresAt: '2099-01-01T00:00:00',
    createdAt: '2024-01-01T00:00:00',
  },
];

const mockCreatedToken: CreateApiKeyResponse = {
  id: 2,
  key: 'secret-key-value',
  name: 'New token',
  expiresAt: validExpiresAt,
};

const onTokenCreated = jest.fn();

const renderAddApiKey = (queries: Parameters<typeof renderWithProviders>[1]['queries'] = {}) => {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.UserApiKeys], mockExistingTokens);
  return renderWithProviders(<AddApiKey onTokenCreated={onTokenCreated} />, {
    queryClient,
    queries,
  });
};

const getNameInput = () =>
  screen.getByLabelText(textMock('user.settings.api_keys.name'), { exact: false });

const getExpiryInput = () =>
  screen.getByLabelText(textMock('user.settings.api_keys.expires_at'), {
    exact: false,
  });

const getAddButton = () =>
  screen.getByRole('button', { name: textMock('user.settings.api_keys.add') });

const fillForm = async (user: ReturnType<typeof userEvent.setup>, name: string, date: string) => {
  await user.type(getNameInput(), name);
  await user.clear(getExpiryInput());
  await user.type(getExpiryInput(), date);
};

describe('AddApiKey', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders the add form', () => {
    renderAddApiKey();
    expect(getNameInput()).toBeInTheDocument();
    expect(getExpiryInput()).toBeInTheDocument();
    expect(getAddButton()).toBeInTheDocument();
  });

  it('sets min to today and max to 365 days from today on the expiry input', () => {
    const maxUtc = (() => {
      const d = new Date(todayUtc);
      d.setUTCDate(d.getUTCDate() + 365);
      return d.toISOString().split('T')[0];
    })();
    renderAddApiKey();
    const expiryInput = getExpiryInput();
    expect(expiryInput).toHaveAttribute('min', todayUtc);
    expect(expiryInput).toHaveAttribute('max', maxUtc);
  });

  it('defaults the expiry input to the max date (365 days from today)', () => {
    const maxUtc = (() => {
      const d = new Date(todayUtc);
      d.setUTCDate(d.getUTCDate() + 365);
      return d.toISOString().split('T')[0];
    })();
    renderAddApiKey();
    expect(getExpiryInput()).toHaveValue(maxUtc);
  });

  it('shows required error only for name when submitting with default expiry', async () => {
    const user = userEvent.setup();
    renderAddApiKey();
    await user.click(getAddButton());
    expect(screen.getAllByText(textMock('validation_errors.required'))).toHaveLength(1);
  });

  it('resets expiry to the max date after successful token creation', async () => {
    const maxUtc = (() => {
      const d = new Date(todayUtc);
      d.setUTCDate(d.getUTCDate() + 365);
      return d.toISOString().split('T')[0];
    })();
    const user = userEvent.setup();
    const addUserApiKey = jest.fn().mockResolvedValue(mockCreatedToken);
    renderAddApiKey({ addUserApiKey });
    await user.type(getNameInput(), 'New token');
    await user.click(getAddButton());
    await screen.findByDisplayValue('secret-key-value');
    await user.click(screen.getByRole('button', { name: textMock('general.close') }));
    expect(getExpiryInput()).toHaveValue(maxUtc);
  });

  it('shows expiry too long error when expiry date exceeds 365 days', async () => {
    const user = userEvent.setup();
    renderAddApiKey();
    await fillForm(user, 'New token', tooLongExpiresAt);
    await user.click(getAddButton());
    expect(
      screen.getByText(textMock('user.settings.api_keys.error_expiry_too_long')),
    ).toBeInTheDocument();
  });

  it('shows expiry in past error when expiry date is in the past', async () => {
    const user = userEvent.setup();
    renderAddApiKey();
    await fillForm(user, 'New token', pastExpiresAt);
    await user.click(getAddButton());
    expect(
      screen.getByText(textMock('user.settings.api_keys.error_expiry_in_past')),
    ).toBeInTheDocument();
  });

  it('shows duplicate name error when name already exists', async () => {
    const user = userEvent.setup();
    renderAddApiKey();
    await fillForm(user, 'Existing token', validExpiresAt);
    await user.click(getAddButton());
    expect(
      screen.getByText(textMock('user.settings.api_keys.error_duplicate_name')),
    ).toBeInTheDocument();
  });

  it('shows duplicate name error when server returns 409 Conflict', async () => {
    const user = userEvent.setup();
    const addUserApiKey = jest.fn().mockRejectedValue({
      response: { status: 409, data: { errorCode: ApiErrorCodes.DuplicateTokenName } },
    });
    renderAddApiKey({ addUserApiKey });
    await fillForm(user, 'New token', validExpiresAt);
    await user.click(getAddButton());
    expect(
      await screen.findByText(textMock('user.settings.api_keys.error_duplicate_name')),
    ).toBeInTheDocument();
  });

  it('calls addUserApiKey with correct payload', async () => {
    const user = userEvent.setup();
    const addUserApiKey = jest.fn().mockResolvedValue(mockCreatedToken);
    renderAddApiKey({ addUserApiKey });
    await fillForm(user, 'New token', validExpiresAt);
    await user.click(getAddButton());
    expect(addUserApiKey).toHaveBeenCalledWith({
      name: 'New token',
      expiresAt: `${validExpiresAt}T23:59:59Z`,
    });
  });

  it('shows the new token key after successful creation', async () => {
    const user = userEvent.setup();
    const addUserApiKey = jest.fn().mockResolvedValue(mockCreatedToken);
    renderAddApiKey({ addUserApiKey });
    await fillForm(user, 'New token', validExpiresAt);
    await user.click(getAddButton());
    expect(await screen.findByDisplayValue('secret-key-value')).toBeInTheDocument();
  });

  it('calls onTokenCreated with the new token id after creation', async () => {
    const user = userEvent.setup();
    const addUserApiKey = jest.fn().mockResolvedValue(mockCreatedToken);
    renderAddApiKey({ addUserApiKey });
    await fillForm(user, 'New token', validExpiresAt);
    await user.click(getAddButton());
    await screen.findByDisplayValue('secret-key-value');
    expect(onTokenCreated).toHaveBeenCalledWith(mockCreatedToken.id);
  });

  it('closes the token alert when close button is clicked', async () => {
    const user = userEvent.setup();
    const addUserApiKey = jest.fn().mockResolvedValue(mockCreatedToken);
    renderAddApiKey({ addUserApiKey });
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
    const addUserApiKey = jest.fn().mockResolvedValue(mockCreatedToken);
    renderAddApiKey({ addUserApiKey });
    await fillForm(user, 'New token', validExpiresAt);
    await user.click(getAddButton());
    await screen.findByDisplayValue('secret-key-value');
    await user.click(
      screen.getByRole('button', {
        name: textMock('user.settings.api_keys.copy'),
      }),
    );
    expect(writeText).toHaveBeenCalledWith('secret-key-value');
    expect(toast.success).toHaveBeenCalledWith(
      textMock('user.settings.api_keys.copy_success'),
      expect.objectContaining({ toastId: 'user.settings.api_keys.copy_success' }),
    );
  });

  it('shows error toast when clipboard write fails', async () => {
    jest.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('Permission denied'));
    const user = userEvent.setup();
    const addUserApiKey = jest.fn().mockResolvedValue(mockCreatedToken);
    renderAddApiKey({ addUserApiKey });
    await fillForm(user, 'New token', validExpiresAt);
    await user.click(getAddButton());
    await screen.findByDisplayValue('secret-key-value');
    await user.click(
      screen.getByRole('button', {
        name: textMock('user.settings.api_keys.copy'),
      }),
    );
    expect(toast.error).toHaveBeenCalledWith(
      textMock('user.settings.api_keys.copy_error'),
      expect.objectContaining({ toastId: 'user.settings.api_keys.copy_error' }),
    );
  });
});
