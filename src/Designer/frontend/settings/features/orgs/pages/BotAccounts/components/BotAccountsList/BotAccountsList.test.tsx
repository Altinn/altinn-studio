import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { renderWithProviders } from '../../../../../../testing/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { BotAccountsList } from './BotAccountsList';
import type { BotAccount } from 'app-shared/types/BotAccount';

jest.mock('../BotAccountApiKeys/BotAccountApiKeys', () => ({
  BotAccountApiKeys: ({ botAccountId }: { botAccountId: string }) => (
    <div>BotAccountApiKeys ({botAccountId})</div>
  ),
}));

const testOrg = 'ttd';

const activeBotAccount: BotAccount = {
  id: '11111111-1111-1111-1111-111111111111',
  username: 'ttd-bot-deploy',
  organizationName: 'ttd',
  deactivated: false,
  created: '2024-01-15T10:00:00Z',
  createdByUsername: 'testuser',
  deployEnvironments: ['tt02'],
  apiKeyCount: 0,
};

const anotherBotAccount: BotAccount = {
  id: '22222222-2222-2222-2222-222222222222',
  username: 'ttd-bot-other',
  organizationName: 'ttd',
  deactivated: false,
  created: '2023-06-01T08:00:00Z',
  createdByUsername: null,
  deployEnvironments: [],
  apiKeyCount: 0,
};

const defaultProps = {
  org: testOrg,
  botAccounts: [] as BotAccount[],
  onEdit: jest.fn(),
  highlightId: undefined as string | undefined,
  expandedId: null as string | null,
  onToggleExpanded: jest.fn(),
};

const renderBotAccountsList = (
  props: Partial<typeof defaultProps> = {},
  queries: Parameters<typeof renderWithProviders>[1]['queries'] = {},
) => {
  const queryClient = createQueryClientMock();
  return renderWithProviders(<BotAccountsList {...defaultProps} {...props} />, {
    queryClient,
    queries,
  });
};

describe('BotAccountsList', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders table column headers', () => {
    renderBotAccountsList();
    expect(
      screen.getByRole('columnheader', {
        name: textMock('settings.orgs.bot_accounts.col_username'),
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', {
        name: textMock('settings.orgs.bot_accounts.col_api_keys'),
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', {
        name: textMock('settings.orgs.bot_accounts.col_environments'),
      }),
    ).toBeInTheDocument();
  });

  it('renders all bot accounts', () => {
    renderBotAccountsList({ botAccounts: [activeBotAccount, anotherBotAccount] });
    expect(screen.getByText('ttd-bot-deploy')).toBeInTheDocument();
    expect(screen.getByText('ttd-bot-other')).toBeInTheDocument();
  });

  it('calls onToggleExpanded when expand button is clicked', async () => {
    const user = userEvent.setup();
    const onToggleExpanded = jest.fn();
    renderBotAccountsList({ botAccounts: [activeBotAccount], onToggleExpanded });
    const expandButton = screen.getByRole('button', {
      name: textMock('settings.orgs.bot_accounts.expand_aria_label', {
        username: activeBotAccount.username,
      }),
    });
    await user.click(expandButton);
    expect(onToggleExpanded).toHaveBeenCalledWith(activeBotAccount.id);
  });

  it('shows API keys section when expandedId matches', () => {
    renderBotAccountsList({ botAccounts: [activeBotAccount], expandedId: activeBotAccount.id });
    expect(screen.getByText(`BotAccountApiKeys (${activeBotAccount.id})`)).toBeInTheDocument();
  });

  it('shows API keys for expanded bot account', () => {
    renderBotAccountsList({
      botAccounts: [activeBotAccount],
      highlightId: activeBotAccount.id,
      expandedId: activeBotAccount.id,
    });
    expect(screen.getByText(`BotAccountApiKeys (${activeBotAccount.id})`)).toBeInTheDocument();
  });

  it('hides API keys section when expandedId does not match', () => {
    renderBotAccountsList({ botAccounts: [activeBotAccount], expandedId: null });
    expect(
      screen.queryByText(`BotAccountApiKeys (${activeBotAccount.id})`),
    ).not.toBeInTheDocument();
  });

  it('calls deactivateBotAccount when delete is confirmed', async () => {
    jest.spyOn(window, 'confirm').mockImplementation(() => true);
    const user = userEvent.setup();
    renderBotAccountsList({ botAccounts: [activeBotAccount] });
    const deleteButton = screen.getByRole('button', {
      name: textMock('settings.orgs.bot_accounts.delete', { username: activeBotAccount.username }),
    });
    await user.click(deleteButton);
    expect(queriesMock.deactivateBotAccount).toHaveBeenCalledWith(testOrg, activeBotAccount.id);
  });

  it('calls onEdit when edit button is clicked', async () => {
    const onEdit = jest.fn();
    const user = userEvent.setup();
    renderBotAccountsList({ botAccounts: [activeBotAccount], onEdit });
    await user.click(
      screen.getByRole('button', {
        name: textMock('settings.orgs.bot_accounts.edit_aria_label', {
          username: activeBotAccount.username,
        }),
      }),
    );
    expect(onEdit).toHaveBeenCalledWith(activeBotAccount);
  });

  it('calls onToggleExpanded when a row is clicked (non-interactive area)', async () => {
    const onToggleExpanded = jest.fn();
    const user = userEvent.setup();
    renderBotAccountsList({ botAccounts: [activeBotAccount], onToggleExpanded });
    await user.click(screen.getByText(activeBotAccount.username));
    expect(onToggleExpanded).toHaveBeenCalledWith(activeBotAccount.id);
  });

  it('renders the expand button with collapse label when expanded', () => {
    renderBotAccountsList({ botAccounts: [activeBotAccount], expandedId: activeBotAccount.id });
    expect(
      screen.getByRole('button', {
        name: textMock('settings.orgs.bot_accounts.collapse_aria_label', {
          username: activeBotAccount.username,
        }),
      }),
    ).toBeInTheDocument();
  });

  it('renders createdByUsername when present', () => {
    renderBotAccountsList({ botAccounts: [activeBotAccount] });
    expect(screen.getByText('testuser')).toBeInTheDocument();
  });

  it('renders em-dash when createdByUsername is null', () => {
    renderBotAccountsList({ botAccounts: [anotherBotAccount] });
    expect(screen.getByText('–')).toBeInTheDocument();
  });

  it('renders the formatted created date', () => {
    renderBotAccountsList({ botAccounts: [activeBotAccount] });
    expect(screen.getByText('15.01.2024')).toBeInTheDocument();
  });

  it('sorts bot accounts by creation date ascending', () => {
    renderBotAccountsList({ botAccounts: [activeBotAccount, anotherBotAccount] });
    const rows = screen.getAllByRole('row');
    const anotherIndex = rows.findIndex((r) => r.textContent?.includes('ttd-bot-other'));
    const activeIndex = rows.findIndex((r) => r.textContent?.includes('ttd-bot-deploy'));
    expect(anotherIndex).toBeLessThan(activeIndex);
  });

  describe('ApiKeysPreviewCell', () => {
    it('shows no-api-keys tag when bot account has no api keys', () => {
      renderBotAccountsList({ botAccounts: [activeBotAccount] });
      expect(
        screen.getByText(textMock('settings.orgs.bot_accounts.no_api_keys')),
      ).toBeInTheDocument();
    });

    it('shows api key count tag when bot account has api keys', () => {
      const botAccountWithKeys = { ...activeBotAccount, apiKeyCount: 1 };
      renderBotAccountsList({ botAccounts: [botAccountWithKeys] });
      expect(
        screen.getByText(textMock('settings.orgs.bot_accounts.api_keys_count', { count: 1 })),
      ).toBeInTheDocument();
    });
  });
});
