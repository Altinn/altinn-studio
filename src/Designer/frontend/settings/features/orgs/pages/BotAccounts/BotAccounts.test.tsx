import { screen } from '@testing-library/react';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { renderWithProviders } from '../../../../testing/mocks';
import { BotAccounts } from './BotAccounts';
import type { BotAccount } from 'app-shared/types/BotAccount';

jest.mock('./components/BotAccountsList/BotAccountsList', () => ({
  BotAccountsList: ({ botAccounts }: { botAccounts: BotAccount[] }) => (
    <div>BotAccountsList ({botAccounts.length})</div>
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

const renderBotAccounts = (botAccounts?: BotAccount[], initialEntries = ['/ttd/settings']) => {
  const queryClient = createQueryClientMock();
  if (botAccounts !== undefined) {
    queryClient.setQueryData([QueryKey.BotAccounts, testOrg], botAccounts);
  }
  return renderWithProviders(<BotAccounts />, { queryClient, initialEntries });
};

describe('BotAccounts', () => {
  it('renders the loading spinner while data is pending', () => {
    renderBotAccounts();
    expect(screen.getByTestId('studio-spinner-test-id')).toBeInTheDocument();
  });

  it('renders the error message when query fails', async () => {
    const queryClient = createQueryClientMock();
    const getBotAccounts = jest.fn().mockRejectedValue(new Error('Failed'));
    renderWithProviders(<BotAccounts />, {
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
});
