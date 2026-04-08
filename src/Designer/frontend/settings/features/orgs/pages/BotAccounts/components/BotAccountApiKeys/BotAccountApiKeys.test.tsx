import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { renderWithProviders } from '../../../../../../testing/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { BotAccountApiKeys } from './BotAccountApiKeys';
import type { BotAccountApiKey } from 'app-shared/types/BotAccount';

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

const renderBotAccountApiKeys = (apiKeys?: BotAccountApiKey[]) => {
  const queryClient = createQueryClientMock();
  if (apiKeys !== undefined) {
    queryClient.setQueryData([QueryKey.BotAccountApiKeys, testOrg, testBotAccountId], apiKeys);
  }
  return renderWithProviders(<BotAccountApiKeys {...defaultProps} />, { queryClient });
};

const getAddButton = () =>
  screen.getByRole('button', { name: textMock('settings.api_keys.add') });

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
});
