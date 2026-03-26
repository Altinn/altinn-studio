import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { renderWithProviders } from 'admin/testing/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { BotAccountApiKeysList } from './BotAccountApiKeysList';
import type { BotAccountApiKey } from 'app-shared/types/BotAccount';

jest.mock('../CreateApiKeyDialog/CreateApiKeyDialog', () => ({
  CreateApiKeyDialog: ({ onSave, onClose }: { onSave: () => void; onClose: () => void }) => (
    <div>
      <div>CreateApiKeyDialog</div>
      <button onClick={onSave}>Save</button>
      <button onClick={onClose}>Cancel</button>
    </div>
  ),
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

const renderBotAccountApiKeysList = (apiKeys?: BotAccountApiKey[]) => {
  const queryClient = createQueryClientMock();
  if (apiKeys !== undefined) {
    queryClient.setQueryData([QueryKey.BotAccountApiKeys, testOrg, testBotAccountId], apiKeys);
  }
  return renderWithProviders(<BotAccountApiKeysList {...defaultProps} />, { queryClient });
};

const getAddButton = () =>
  screen.getByRole('button', { name: textMock('settings.orgs.bot_accounts.add_api_key') });

describe('BotAccountApiKeysList', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders the loading spinner while data is pending', () => {
    renderBotAccountApiKeysList();
    expect(screen.getByTestId('studio-spinner-test-id')).toBeInTheDocument();
  });

  it('renders error message when query fails', async () => {
    const queryClient = createQueryClientMock();
    const getBotAccountApiKeys = jest.fn().mockRejectedValue(new Error('Failed'));
    renderWithProviders(<BotAccountApiKeysList {...defaultProps} />, {
      queries: { getBotAccountApiKeys },
      queryClient,
    });
    await screen.findByText(textMock('settings.orgs.bot_accounts.api_keys_error'));
    expect(
      screen.getByText(textMock('settings.orgs.bot_accounts.api_keys_error')),
    ).toBeInTheDocument();
  });

  it('renders "no api keys" message when list is empty', () => {
    renderBotAccountApiKeysList([]);
    expect(
      screen.getByText(textMock('settings.orgs.bot_accounts.no_api_keys')),
    ).toBeInTheDocument();
  });

  it('renders the add api key button', () => {
    renderBotAccountApiKeysList([]);
    expect(getAddButton()).toBeInTheDocument();
  });

  it('renders table rows for each api key', () => {
    renderBotAccountApiKeysList([activeApiKey, expiredApiKey]);
    expect(screen.getByText('Deploy key')).toBeInTheDocument();
    expect(screen.getByText('Old key')).toBeInTheDocument();
  });

  it('shows expired tag for expired keys', () => {
    renderBotAccountApiKeysList([expiredApiKey]);
    expect(
      screen.getByText(textMock('settings.orgs.bot_accounts.api_key_expired')),
    ).toBeInTheDocument();
  });

  it('does not show expired tag for active keys', () => {
    renderBotAccountApiKeysList([activeApiKey]);
    expect(
      screen.queryByText(textMock('settings.orgs.bot_accounts.api_key_expired')),
    ).not.toBeInTheDocument();
  });

  it('opens create api key dialog when add button is clicked', async () => {
    const user = userEvent.setup();
    renderBotAccountApiKeysList([]);
    await user.click(getAddButton());
    expect(screen.getByText('CreateApiKeyDialog')).toBeInTheDocument();
  });

  it('calls createBotAccountApiKey when saving from the dialog', async () => {
    const user = userEvent.setup();
    renderBotAccountApiKeysList([]);
    await user.click(getAddButton());
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(queriesMock.createBotAccountApiKey).toHaveBeenCalledWith(
      testOrg,
      testBotAccountId,
      expect.objectContaining({ name: '' }),
    );
  });

  it('calls revokeBotAccountApiKey when revoke is confirmed', async () => {
    const user = userEvent.setup();
    renderBotAccountApiKeysList([activeApiKey]);
    const revokeButtons = screen.getAllByRole('button');
    const revokeButton = revokeButtons.find((btn) => btn.getAttribute('data-color') === 'danger')!;
    await user.click(revokeButton);
    expect(queriesMock.revokeBotAccountApiKey).toHaveBeenCalledWith(
      testOrg,
      testBotAccountId,
      activeApiKey.id,
    );
  });
});
