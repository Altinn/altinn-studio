import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
  afterEach(() => jest.clearAllMocks());

  it('renders the bot accounts tab', () => {
    mockUseFeatureFlag.mockReturnValue(false);
    renderMenu();
    expect(getBotAccountsTab()).toBeInTheDocument();
  });

  it('does not render the contact points tab when Admin is disabled', () => {
    mockUseFeatureFlag.mockReturnValue(false);
    renderMenu();
    expect(
      screen.queryByRole('tab', {
        name: textMock('settings.orgs.contact_points.menu.contact_points'),
      }),
    ).not.toBeInTheDocument();
  });

  it('renders the contact points tab when Admin is enabled', () => {
    mockUseFeatureFlag.mockImplementation((flag: FeatureFlag) => flag === FeatureFlag.Admin);
    renderMenu();
    expect(getContactPointsTab()).toBeInTheDocument();
  });

  it('does not select a tab when pathname ends with empty string', () => {
    mockUseFeatureFlag.mockImplementation((flag: FeatureFlag) => flag === FeatureFlag.Admin);
    renderMenu(['/settings/']);
    expect(getBotAccountsTab()).toHaveAttribute('tabindex', '-1');
    expect(getContactPointsTab()).toHaveAttribute('tabindex', '-1');
  });

  it('navigates to tab when a tab is clicked', async () => {
    mockUseFeatureFlag.mockImplementation((flag: FeatureFlag) => flag === FeatureFlag.Admin);
    const user = userEvent.setup();
    renderMenu(['/contact-points']);
    await user.click(getContactPointsTab());
    expect(mockNavigate).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: 'contact-points' }),
    );
  });
});
