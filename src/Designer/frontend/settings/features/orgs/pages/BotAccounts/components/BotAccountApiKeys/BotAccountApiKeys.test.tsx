import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { renderWithProviders } from '../../../../../../testing/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { BotAccountApiKeys } from './BotAccountApiKeys';
import type {
  BotAccountApiKey,
  CreateBotAccountApiKeyResponse,
  BotAccount,
} from 'app-shared/types/BotAccount';
import { ApiErrorCodes } from 'app-shared/enums/ApiErrorCodes';
import { ServerCodes } from 'app-shared/enums/ServerCodes';
import { toast } from 'react-toastify';

jest.mock('react-toastify', () => ({
  ...jest.requireActual('react-toastify'),
  toast: { success: jest.fn(), error: jest.fn() },
}));

const testOrg = 'ttd';
const testBotAccountId = '11111111-1111-1111-1111-111111111111';

const activeApiKey: BotAccountApiKey = {
  id: 1,
  name: 'Deploy key',
  expiresAt: '2099-12-31T23:59:59Z',
  createdAt: '2024-01-15T10:00:00Z',
  createdByUsername: 'testuser',
};

const expiredApiKey: BotAccountApiKey = {
  id: 2,
  name: 'Old key',
  expiresAt: '2020-01-01T00:00:00Z',
  createdAt: '2019-06-01T08:00:00Z',
  createdByUsername: null,
};

const defaultProps = {
  org: testOrg,
  botAccountId: testBotAccountId,
};

const renderBotAccountApiKeys = (
  apiKeys?: BotAccountApiKey[],
  queries: Parameters<typeof renderWithProviders>[1]['queries'] = {},
) => {
  const queryClient = createQueryClientMock();
  if (apiKeys !== undefined) {
    queryClient.setQueryData([QueryKey.BotAccountApiKeys, testOrg, testBotAccountId], apiKeys);
  }
  return renderWithProviders(<BotAccountApiKeys {...defaultProps} />, { queryClient, queries });
};

const getAddButton = () => screen.getByRole('button', { name: textMock('settings.api_keys.add') });

describe('BotAccountApiKeys', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders the loading spinner while data is pending', () => {
    renderBotAccountApiKeys();
    expect(screen.getByTestId('studio-spinner-test-id')).toBeInTheDocument();
  });

  it('renders error message when query fails', async () => {
    const queryClient = createQueryClientMock();
    const getBotAccountApiKeys = jest.fn().mockRejectedValue(new Error('Failed'));
    renderWithProviders(<BotAccountApiKeys {...defaultProps} />, {
      queries: { getBotAccountApiKeys },
      queryClient,
    });
    expect(await screen.findByText(textMock('settings.api_keys.load_error'))).toBeInTheDocument();
  });

  it('renders the add api key button', () => {
    renderBotAccountApiKeys([]);
    expect(getAddButton()).toBeInTheDocument();
  });

  it('renders table rows for each api key', () => {
    renderBotAccountApiKeys([activeApiKey, expiredApiKey]);
    expect(screen.getByText('Deploy key')).toBeInTheDocument();
    expect(screen.getByText('Old key')).toBeInTheDocument();
  });

  it('shows expired tag for expired keys', () => {
    renderBotAccountApiKeys([expiredApiKey]);
    expect(screen.getByText(textMock('settings.api_keys.expired'))).toBeInTheDocument();
  });

  it('does not show expired tag for active keys', () => {
    renderBotAccountApiKeys([activeApiKey]);
    expect(screen.queryByText(textMock('settings.api_keys.expired'))).not.toBeInTheDocument();
  });

  it('calls revokeBotAccountApiKey when delete is confirmed', async () => {
    jest.spyOn(window, 'confirm').mockImplementation(() => true);
    const user = userEvent.setup();
    renderBotAccountApiKeys([activeApiKey]);
    const deleteButton = screen.getByRole('button', {
      name: textMock('settings.api_keys.delete', { name: activeApiKey.name }),
    });
    await user.click(deleteButton);
    expect(queriesMock.revokeBotAccountApiKey).toHaveBeenCalledWith(
      testOrg,
      testBotAccountId,
      activeApiKey.id,
    );
  });

  it('shows the new api key after successful creation', async () => {
    const newKeyResponse: CreateBotAccountApiKeyResponse = {
      id: 3,
      key: 'new-secret-key',
      name: 'New key',
      expiresAt: '2099-12-31T23:59:59Z',
      createdByUsername: 'testuser',
    };
    const createBotAccountApiKey = jest.fn().mockResolvedValue(newKeyResponse);
    const user = userEvent.setup();
    renderBotAccountApiKeys([], { createBotAccountApiKey });
    await user.click(screen.getByRole('button', { name: textMock('settings.api_keys.add') }));
    const nameInput = screen.getByLabelText(textMock('settings.api_keys.field_name'), {
      exact: false,
    });
    await user.type(nameInput, 'New key');
    await user.click(screen.getByRole('button', { name: textMock('general.add') }));
    expect(await screen.findByDisplayValue('new-secret-key')).toBeInTheDocument();
  });

  it('closes the new api key dialog when the close button is clicked', async () => {
    const newKeyResponse: CreateBotAccountApiKeyResponse = {
      id: 3,
      key: 'new-secret-key',
      name: 'New key',
      expiresAt: '2099-12-31T23:59:59Z',
      createdByUsername: 'testuser',
    };
    const createBotAccountApiKey = jest.fn().mockResolvedValue(newKeyResponse);
    const user = userEvent.setup();
    renderBotAccountApiKeys([], { createBotAccountApiKey });
    await user.click(screen.getByRole('button', { name: textMock('settings.api_keys.add') }));
    const nameInput = screen.getByLabelText(textMock('settings.api_keys.field_name'), {
      exact: false,
    });
    await user.type(nameInput, 'New key');
    await user.click(screen.getByRole('button', { name: textMock('general.add') }));
    await screen.findByDisplayValue('new-secret-key');
    await user.click(screen.getByRole('button', { name: textMock('general.close') }));
    expect(screen.queryByDisplayValue('new-secret-key')).not.toBeInTheDocument();
  });

  it('shows duplicate name error when server returns 409 Conflict with DuplicateTokenName', async () => {
    const createBotAccountApiKey = jest.fn().mockRejectedValue({
      response: {
        status: ServerCodes.Conflict,
        data: { errorCode: ApiErrorCodes.DuplicateTokenName },
      },
    });
    const user = userEvent.setup();
    renderBotAccountApiKeys([activeApiKey], { createBotAccountApiKey });
    await user.click(screen.getByRole('button', { name: textMock('settings.api_keys.add') }));
    const nameInput = screen.getByLabelText(textMock('settings.api_keys.field_name'), {
      exact: false,
    });
    await user.type(nameInput, 'Deploy key');
    await user.click(screen.getByRole('button', { name: textMock('general.add') }));
    expect(
      await screen.findByText(textMock('settings.api_keys.error_duplicate_name')),
    ).toBeInTheDocument();
  });

  it('clears duplicate name error from API when name input changes', async () => {
    const createBotAccountApiKey = jest.fn().mockRejectedValue({
      response: {
        status: ServerCodes.Conflict,
        data: { errorCode: ApiErrorCodes.DuplicateTokenName },
      },
    });
    const user = userEvent.setup();
    renderBotAccountApiKeys([activeApiKey], { createBotAccountApiKey });
    await user.click(screen.getByRole('button', { name: textMock('settings.api_keys.add') }));
    const nameInput = screen.getByLabelText(textMock('settings.api_keys.field_name'), {
      exact: false,
    });
    await user.type(nameInput, 'Deploy key');
    await user.click(screen.getByRole('button', { name: textMock('general.add') }));
    await screen.findByText(textMock('settings.api_keys.error_duplicate_name'));
    await user.type(nameInput, ' 2');
    expect(
      screen.queryByText(textMock('settings.api_keys.error_duplicate_name')),
    ).not.toBeInTheDocument();
  });

  it('copies the new api key and shows success toast', async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    jest.spyOn(navigator.clipboard, 'writeText').mockImplementation(writeText);
    const newKeyResponse: CreateBotAccountApiKeyResponse = {
      id: 3,
      key: 'new-secret-key',
      name: 'New key',
      expiresAt: '2099-12-31T23:59:59Z',
      createdByUsername: 'testuser',
    };
    const createBotAccountApiKey = jest.fn().mockResolvedValue(newKeyResponse);
    const user = userEvent.setup();
    renderBotAccountApiKeys([], { createBotAccountApiKey });
    await user.click(screen.getByRole('button', { name: textMock('settings.api_keys.add') }));
    const nameInput = screen.getByLabelText(textMock('settings.api_keys.field_name'), {
      exact: false,
    });
    await user.type(nameInput, 'New key');
    await user.click(screen.getByRole('button', { name: textMock('general.add') }));
    await screen.findByDisplayValue('new-secret-key');
    await user.click(screen.getByRole('button', { name: textMock('settings.api_keys.copy') }));
    expect(writeText).toHaveBeenCalledWith('new-secret-key');
    expect(toast.success).toHaveBeenCalledWith(
      textMock('settings.api_keys.copy_success'),
      expect.objectContaining({ toastId: 'settings.api_keys.copy_success' }),
    );
  });

  it('updates BotAccounts cache with apiKeyCount when API keys load', async () => {
    const queryClient = createQueryClientMock();
    const botAccount: BotAccount = {
      id: testBotAccountId,
      username: 'test-bot',
      organizationName: testOrg,
      deactivated: false,
      created: '2024-01-15T10:00:00Z',
      createdByUsername: 'testuser',
      deployEnvironments: [],
      apiKeyCount: 0,
    };
    queryClient.setQueryData([QueryKey.BotAccounts, testOrg], [botAccount]);
    queryClient.setQueryData(
      [QueryKey.BotAccountApiKeys, testOrg, testBotAccountId],
      [activeApiKey, expiredApiKey],
    );

    renderWithProviders(<BotAccountApiKeys {...defaultProps} />, { queryClient });

    await waitFor(() => {
      const botAccounts = queryClient.getQueryData<BotAccount[]>([QueryKey.BotAccounts, testOrg]);
      expect(botAccounts?.[0].apiKeyCount).toBe(2);
    });
  });
});
