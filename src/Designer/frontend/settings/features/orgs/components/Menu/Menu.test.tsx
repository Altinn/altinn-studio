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

const mockEnvironment: { environment: { featureFlags: { studioOidc: boolean } } | null } = {
  environment: null,
};
jest.mock('app-shared/contexts/EnvironmentConfigContext', () => ({
  useEnvironmentConfig: () => mockEnvironment,
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
  beforeEach(() => {
    mockEnvironment.environment = null;
  });

  afterEach(() => jest.clearAllMocks());

  it('renders the bot accounts tab when studioOidc is enabled', () => {
    mockEnvironment.environment = { featureFlags: { studioOidc: true } };
    renderMenu();
    expect(getBotAccountsTab()).toBeInTheDocument();
  });

  it('does not render the bot accounts tab when studioOidc is disabled', () => {
    mockEnvironment.environment = { featureFlags: { studioOidc: false } };
    renderMenu();
    expect(
      screen.queryByRole('tab', {
        name: textMock('settings.orgs.bot_accounts.menu.bot_accounts'),
      }),
    ).not.toBeInTheDocument();
  });

  it('renders the contact points tab', () => {
    mockEnvironment.environment = { featureFlags: { studioOidc: false } };
    renderMenu();
    expect(getContactPointsTab()).toBeInTheDocument();
  });

  it('navigates when a tab is clicked', async () => {
    const user = userEvent.setup();
    mockEnvironment.environment = { featureFlags: { studioOidc: false } };
    renderMenu();
    await user.click(getContactPointsTab());
    expect(mockNavigate).toHaveBeenCalledWith({ pathname: 'contact-points' });
  });
});
