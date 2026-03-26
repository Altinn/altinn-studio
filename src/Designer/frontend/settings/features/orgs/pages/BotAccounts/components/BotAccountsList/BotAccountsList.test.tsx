import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from 'admin/testing/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { BotAccountsList } from './BotAccountsList';
import type { BotAccount } from 'app-shared/types/BotAccount';

jest.mock('../BotAccountApiKeysList/BotAccountApiKeysList', () => ({
  BotAccountApiKeysList: ({ botAccountId }: { botAccountId: string }) => (
    <div>BotAccountApiKeysList ({botAccountId})</div>
  ),
}));

jest.mock('../CreateBotAccountDialog/CreateBotAccountDialog', () => ({
  CreateBotAccountDialog: ({ onSave, onClose }: { onSave: () => void; onClose: () => void }) => (
    <div>
      <div>CreateBotAccountDialog</div>
      <button onClick={onSave}>Save</button>
      <button onClick={onClose}>Cancel</button>
    </div>
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
};

const deactivatedBotAccount: BotAccount = {
  id: '22222222-2222-2222-2222-222222222222',
  username: 'ttd-bot-old',
  organizationName: 'ttd',
  deactivated: true,
  created: '2023-06-01T08:00:00Z',
  createdByUsername: null,
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
      screen.getByRole('columnheader', { name: textMock('settings.orgs.bot_accounts.col_status') }),
    ).toBeInTheDocument();
  });

  it('renders a row per bot account', () => {
    renderBotAccountsList({ botAccounts: [activeBotAccount, deactivatedBotAccount] });
    expect(screen.getByText('ttd-bot-deploy')).toBeInTheDocument();
    expect(screen.getByText('ttd-bot-old')).toBeInTheDocument();
  });

  it('shows active tag for active bot accounts', () => {
    renderBotAccountsList({ botAccounts: [activeBotAccount] });
    expect(
      screen.getByText(textMock('settings.orgs.bot_accounts.status_active')),
    ).toBeInTheDocument();
  });

  it('shows deactivated tag for deactivated bot accounts', () => {
    renderBotAccountsList({ botAccounts: [deactivatedBotAccount] });
    expect(
      screen.getByText(textMock('settings.orgs.bot_accounts.status_deactivated')),
    ).toBeInTheDocument();
  });

  it('does not show deactivate button for deactivated bot accounts', () => {
    renderBotAccountsList({ botAccounts: [deactivatedBotAccount] });
    expect(
      screen.queryByRole('button', { name: textMock('settings.orgs.bot_accounts.deactivate') }),
    ).not.toBeInTheDocument();
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

  it('opens create dialog when add button is clicked', async () => {
    const user = userEvent.setup();
    renderBotAccountsList();
    await user.click(getAddButton());
    expect(screen.getByText('CreateBotAccountDialog')).toBeInTheDocument();
  });

  it('calls createBotAccount when saving from the dialog', async () => {
    const user = userEvent.setup();
    renderBotAccountsList();
    await user.click(getAddButton());
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(queriesMock.createBotAccount).toHaveBeenCalledWith(
      testOrg,
      expect.objectContaining({ name: '' }),
    );
  });

  it('calls deactivateBotAccount when deactivate is confirmed', async () => {
    const user = userEvent.setup();
    renderBotAccountsList({ botAccounts: [activeBotAccount] });
    const deactivateButtons = screen.getAllByRole('button');
    const deactivateButton = deactivateButtons.find(
      (btn) => btn.getAttribute('data-color') === 'danger',
    )!;
    await user.click(deactivateButton);
    expect(queriesMock.deactivateBotAccount).toHaveBeenCalledWith(testOrg, activeBotAccount.id);
  });
});
