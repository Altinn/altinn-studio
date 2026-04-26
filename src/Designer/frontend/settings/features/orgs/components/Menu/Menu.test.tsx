import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Menu } from './Menu';
import { renderWithProviders } from '../../../../testing/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const renderMenu = (initialEntries: string[] = ['/orgs/ttd/bot-accounts']) =>
  renderWithProviders(<Menu />, { initialEntries });

const getContactPointsTab = () =>
  screen.getByRole('tab', {
    name: textMock('settings.orgs.contact_points.menu.contact_points'),
  });

const getBotAccountsTab = () =>
  screen.getByRole('tab', {
    name: textMock('settings.orgs.bot_accounts.menu.bot_accounts'),
  });

describe('Menu', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders the contact points tab', () => {
    renderMenu();
    expect(getContactPointsTab()).toBeInTheDocument();
  });

  it('does not select a tab when pathname ends with empty string', () => {
    renderMenu(['/settings/']);
    expect(getBotAccountsTab()).toHaveAttribute('tabindex', '-1');
    expect(getContactPointsTab()).toHaveAttribute('tabindex', '-1');
  });

  it('navigates to tab when a tab is clicked', async () => {
    const user = userEvent.setup();
    renderMenu(['/contact-points']);
    await user.click(getContactPointsTab());
    expect(mockNavigate).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: 'contact-points' }),
    );
  });
});
