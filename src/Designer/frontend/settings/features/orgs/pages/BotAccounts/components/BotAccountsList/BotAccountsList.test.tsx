import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
};

const anotherBotAccount: BotAccount = {
  id: '22222222-2222-2222-2222-222222222222',
  username: 'ttd-bot-other',
  organizationName: 'ttd',
  deactivated: false,
  created: '2023-06-01T08:00:00Z',
  createdByUsername: null,
  deployEnvironments: [],
};

const defaultProps = {
  org: testOrg,
  botAccounts: [] as BotAccount[],
  onEdit: jest.fn(),
};

const renderBotAccountsList = (props: Partial<typeof defaultProps> = {}) =>
  renderWithProviders(<BotAccountsList {...defaultProps} {...props} />);

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

  it('expands API keys section when expand button is clicked', async () => {
    const user = userEvent.setup();
    renderBotAccountsList({ botAccounts: [activeBotAccount] });
    const expandButton = screen.getByRole('button', {
      name: textMock('settings.orgs.bot_accounts.expand_aria_label', {
        username: activeBotAccount.username,
      }),
    });
    await user.click(expandButton);
    expect(screen.getByText(`BotAccountApiKeys (${activeBotAccount.id})`)).toBeInTheDocument();
  });

  it('auto-expands highlighted bot account', () => {
    renderBotAccountsList({ botAccounts: [activeBotAccount], highlightId: activeBotAccount.id });
    expect(screen.getByText(`BotAccountApiKeys (${activeBotAccount.id})`)).toBeInTheDocument();
  });

  it('collapses API keys section when expand button is clicked again', async () => {
    const user = userEvent.setup();
    renderBotAccountsList({ botAccounts: [activeBotAccount] });
    const expandButton = screen.getByRole('button', {
      name: textMock('settings.orgs.bot_accounts.expand_aria_label', {
        username: activeBotAccount.username,
      }),
    });
    await user.click(expandButton);
    await user.click(expandButton);
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
});
