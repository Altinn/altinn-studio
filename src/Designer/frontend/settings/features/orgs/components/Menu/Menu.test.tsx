import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Menu } from './Menu';
import { renderWithProviders } from '../../../../testing/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual('react-router-dom')),
  useNavigate: () => mockNavigate,
}));

const renderMenu = (initialEntries: string[] = ['/ttd/bot-accounts']) =>
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
  afterEach(() => vi.clearAllMocks());

  it('renders the bot accounts tab', () => {
    renderMenu();
    expect(getBotAccountsTab()).toBeInTheDocument();
  });

  it('renders the contact points tab', () => {
    renderMenu();
    expect(getContactPointsTab()).toBeInTheDocument();
  });

  it('navigates when a tab is clicked', async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(getContactPointsTab());
    expect(mockNavigate).toHaveBeenCalledWith({ pathname: 'contact-points' });
  });
});
