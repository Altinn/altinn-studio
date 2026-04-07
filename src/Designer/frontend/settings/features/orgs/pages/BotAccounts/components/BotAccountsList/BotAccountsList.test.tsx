import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from 'settings/testing/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { BotAccountsList } from './BotAccountsList';
import type { BotAccount } from 'app-shared/types/BotAccount';

jest.mock('../BotAccountApiKeysList/BotAccountApiKeysList', () => ({
  BotAccountApiKeysList: ({ botAccountId }: { botAccountId: string }) => (
    <div>BotAccountApiKeysList ({botAccountId})</div>
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

const deactivatedBotAccount: BotAccount = {
  id: '22222222-2222-2222-2222-222222222222',
  username: 'ttd-bot-old',
  organizationName: 'ttd',
  deactivated: true,
  created: '2023-06-01T08:00:00Z',
  createdByUsername: null,
  deployEnvironments: [],
};

const defaultProps = {
  org: testOrg,
  botAccounts: [] as BotAccount[],
  availableEnvironments: [] as string[],
};

const renderBotAccountsList = (props: Partial<typeof defaultProps> = {}) =>
  renderWithProviders(<BotAccountsList {...defaultProps} {...props} />);

const getAddButton = () =>
  screen.getByRole('button', { name: textMock('settings.orgs.bot_accounts.add_bot_account') });

describe('BotAccountsList', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders the list heading', () => {
    renderBotAccountsList();
    expect(
      screen.getByRole('heading', {
        name: textMock('settings.orgs.bot_accounts.list_heading'),
      }),
    ).toBeInTheDocument();
  });

  it('renders the add bot account button', () => {
    renderBotAccountsList();
    expect(getAddButton()).toBeInTheDocument();
  });

  it('renders table column headers', () => {
    renderBotAccountsList();
    expect(
      screen.getByRole('columnheader', {
        name: textMock('settings.orgs.bot_accounts.col_username'),
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', {
        name: textMock('settings.orgs.bot_accounts.col_environments'),
      }),
    ).toBeInTheDocument();
  });

  it('renders active bot accounts', () => {
    renderBotAccountsList({ botAccounts: [activeBotAccount, deactivatedBotAccount] });
    expect(screen.getByText('ttd-bot-deploy')).toBeInTheDocument();
    expect(screen.queryByText('ttd-bot-old')).not.toBeInTheDocument();
  });

  it('does not show deactivated bot accounts', () => {
    renderBotAccountsList({ botAccounts: [deactivatedBotAccount] });
    expect(screen.queryByText('ttd-bot-old')).not.toBeInTheDocument();
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
    expect(screen.getByText(`BotAccountApiKeysList (${activeBotAccount.id})`)).toBeInTheDocument();
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
      screen.queryByText(`BotAccountApiKeysList (${activeBotAccount.id})`),
    ).not.toBeInTheDocument();
  });

  it('calls createBotAccount when saving from the add dialog', async () => {
    const user = userEvent.setup();
    renderBotAccountsList();
    await user.click(getAddButton());
    const saveButton = screen.getByRole('button', {
      name: textMock('settings.orgs.bot_accounts.create'),
    });
    await user.click(saveButton);
    expect(queriesMock.createBotAccount).toHaveBeenCalledWith(
      testOrg,
      expect.objectContaining({ name: '' }),
    );
  });

  it('calls deactivateBotAccount when delete is confirmed', async () => {
    const user = userEvent.setup();
    renderBotAccountsList({ botAccounts: [activeBotAccount] });
    const deleteButton = screen.getByRole('button', {
      name: textMock('settings.orgs.bot_accounts.delete'),
    });
    await user.click(deleteButton);
    expect(queriesMock.deactivateBotAccount).toHaveBeenCalledWith(testOrg, activeBotAccount.id);
  });
});
