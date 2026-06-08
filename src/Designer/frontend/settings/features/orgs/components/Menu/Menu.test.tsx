import { screen } from '@testing-library/react';
import { Menu } from './Menu';
import { renderWithProviders } from '../../../../testing/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { FeatureFlag } from '@studio/feature-flags';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const mockUseFeatureFlag = jest.fn();
jest.mock('@studio/feature-flags', () => ({
  ...jest.requireActual('@studio/feature-flags'),
  useFeatureFlag: (flag: FeatureFlag) => mockUseFeatureFlag(flag),
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
    mockUseFeatureFlag.mockReturnValue(false);
    mockEnvironment.environment = { featureFlags: { studioOidc: true } };
    renderMenu();
    expect(getBotAccountsTab()).toBeInTheDocument();
  });

  it('does not render the bot accounts tab when studioOidc is disabled', () => {
    mockUseFeatureFlag.mockReturnValue(false);
    mockEnvironment.environment = { featureFlags: { studioOidc: false } };
    renderMenu();
    expect(
      screen.queryByRole('tab', {
        name: textMock('settings.orgs.bot_accounts.menu.bot_accounts'),
      }),
    ).not.toBeInTheDocument();
  });

  it('does not render the contact points tab when Admin is disabled', () => {
    mockUseFeatureFlag.mockReturnValue(false);
    mockEnvironment.environment = { featureFlags: { studioOidc: true } };
    renderMenu();
    expect(
      screen.queryByRole('tab', {
        name: textMock('settings.orgs.contact_points.menu.contact_points'),
      }),
    ).not.toBeInTheDocument();
  });

  it('renders the contact points tab when Admin is enabled', () => {
    mockUseFeatureFlag.mockImplementation((flag: FeatureFlag) => flag === FeatureFlag.Admin);
    mockEnvironment.environment = { featureFlags: { studioOidc: false } };
    renderMenu();
    expect(getContactPointsTab()).toBeInTheDocument();
  });
});
