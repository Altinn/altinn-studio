import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { renderWithProviders } from '../../../../testing/mocks';
import { BotAccounts } from './BotAccounts';
import { Route, Routes } from 'react-router-dom';
import type { BotAccount } from 'app-shared/types/BotAccount';

const RoutedBotAccounts = () => (
  <Routes>
    <Route path=':owner/*' element={<BotAccounts />} />
  </Routes>
);

jest.mock('./components/BotAccountsList/BotAccountsList', () => ({
  BotAccountsList: ({
    botAccounts,
    onEdit,
    expandedId,
    onToggleExpanded,
  }: {
    botAccounts: BotAccount[];
    onEdit: (b: BotAccount) => void;
    expandedId: string | null;
    onToggleExpanded: (id: string) => void;
  }) => (
    <div>
      <div>BotAccountsList ({botAccounts.length})</div>
      {botAccounts.map((b) => (
        <div key={b.id}>
          <button onClick={() => onEdit(b)}>Edit {b.username}</button>
          <button onClick={() => onToggleExpanded(b.id)}>Toggle {b.id}</button>
          {expandedId === b.id && <div>Expanded {b.id}</div>}
        </div>
      ))}
    </div>
  ),
}));

jest.mock('./components/BotAccountDialog/BotAccountDialog', () => ({
  BotAccountDialog: ({
    editingId,
    onClose,
    onCreated,
  }: {
    editingId: string | null;
    onClose: () => void;
    onCreated?: (id: string) => void;
  }) => (
    <div>
      <div>{editingId ? `EditDialog(${editingId})` : 'AddDialog'}</div>
      <button onClick={onClose}>CloseDialog</button>
      {onCreated && <button onClick={() => onCreated('new-bot-id')}>TriggerCreated</button>}
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
  deployEnvironments: [],
  apiKeyCount: 0,
};

const renderBotAccounts = (botAccounts?: BotAccount[], initialEntries = ['/ttd/settings']) => {
  const queryClient = createQueryClientMock();
  if (botAccounts !== undefined) {
    queryClient.setQueryData([QueryKey.BotAccounts, testOrg], botAccounts);
  }
  return renderWithProviders(<RoutedBotAccounts />, { queryClient, initialEntries });
};

describe('BotAccounts', () => {
  it('renders the loading spinner while data is pending', () => {
    renderBotAccounts();
    expect(screen.getByTestId('studio-spinner-test-id')).toBeInTheDocument();
  });

  it('renders the error message when query fails', async () => {
    const queryClient = createQueryClientMock();
    const getBotAccounts = jest.fn().mockRejectedValue(new Error('Failed'));
    renderWithProviders(<RoutedBotAccounts />, {
      queries: { getBotAccounts },
      queryClient,
      initialEntries: ['/ttd/settings'],
    });
    await screen.findByText(textMock('settings.orgs.bot_accounts.error'));
    expect(screen.getByText(textMock('settings.orgs.bot_accounts.error'))).toBeInTheDocument();
  });

  it('renders the page heading when data is loaded', () => {
    renderBotAccounts([]);
    expect(
      screen.getByRole('heading', {
        name: textMock('settings.orgs.bot_accounts.page_heading'),
      }),
    ).toBeInTheDocument();
  });

  it('passes bot accounts to BotAccountsList', () => {
    renderBotAccounts([activeBotAccount]);
    expect(screen.getByText('BotAccountsList (1)')).toBeInTheDocument();
  });

  it('passes empty array to BotAccountsList when there are no bot accounts', () => {
    renderBotAccounts([]);
    expect(screen.getByText('BotAccountsList (0)')).toBeInTheDocument();
  });

  it('renders the add bot account button', () => {
    renderBotAccounts([]);
    expect(
      screen.getByRole('button', { name: textMock('settings.orgs.bot_accounts.add_bot_account') }),
    ).toBeInTheDocument();
  });

  it('opens add dialog when add button is clicked', async () => {
    const user = userEvent.setup();
    renderBotAccounts([]);
    await user.click(
      screen.getByRole('button', { name: textMock('settings.orgs.bot_accounts.add_bot_account') }),
    );
    expect(screen.getByText('AddDialog')).toBeInTheDocument();
  });

  it('closes dialog when CloseDialog is clicked', async () => {
    const user = userEvent.setup();
    renderBotAccounts([]);
    await user.click(
      screen.getByRole('button', { name: textMock('settings.orgs.bot_accounts.add_bot_account') }),
    );
    expect(screen.getByText('AddDialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'CloseDialog' }));
    expect(screen.queryByText('AddDialog')).not.toBeInTheDocument();
  });

  it('opens edit dialog with the bot account id when onEdit is called', async () => {
    const user = userEvent.setup();
    renderBotAccounts([activeBotAccount]);
    await user.click(screen.getByRole('button', { name: `Edit ${activeBotAccount.username}` }));
    expect(screen.getByText(`EditDialog(${activeBotAccount.id})`)).toBeInTheDocument();
  });

  it('expands a bot account when onToggleExpanded is called', async () => {
    const user = userEvent.setup();
    renderBotAccounts([activeBotAccount]);
    await user.click(screen.getByRole('button', { name: `Toggle ${activeBotAccount.id}` }));
    expect(screen.getByText(`Expanded ${activeBotAccount.id}`)).toBeInTheDocument();
  });

  it('collapses a bot account when onToggleExpanded is called a second time', async () => {
    const user = userEvent.setup();
    renderBotAccounts([activeBotAccount]);
    await user.click(screen.getByRole('button', { name: `Toggle ${activeBotAccount.id}` }));
    await user.click(screen.getByRole('button', { name: `Toggle ${activeBotAccount.id}` }));
    expect(screen.queryByText(`Expanded ${activeBotAccount.id}`)).not.toBeInTheDocument();
  });

  it('expands the newly created bot account and opens it after onCreated is called', async () => {
    const user = userEvent.setup();
    renderBotAccounts([{ ...activeBotAccount, id: 'new-bot-id' }]);
    await user.click(
      screen.getByRole('button', { name: textMock('settings.orgs.bot_accounts.add_bot_account') }),
    );
    await user.click(screen.getByRole('button', { name: 'TriggerCreated' }));
    expect(screen.getByText('Expanded new-bot-id')).toBeInTheDocument();
  });
});
