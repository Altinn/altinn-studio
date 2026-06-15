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

const renderMenu = (initialEntries: string[] = ['/settings/user/api-keys']) =>
  renderWithProviders(<Menu />, { initialEntries });

const getApiKeysTab = () =>
  screen.getByRole('tab', { name: textMock('settings.user.api_keys.api_keys') });

const getPrivacyTab = () =>
  screen.getByRole('tab', { name: textMock('settings.user.privacy.heading') });

describe('Menu', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders the api keys tab as selected when on the api-keys route', () => {
    renderMenu();
    expect(getApiKeysTab()).toHaveAttribute('tabindex', '0');
  });

  it('renders the privacy tab as selected when on the privacy route', () => {
    renderMenu(['/settings/user/privacy']);
    expect(getPrivacyTab()).toHaveAttribute('tabindex', '0');
  });

  it('navigates to api-keys when the api keys tab is clicked', async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(getApiKeysTab());
    expect(mockNavigate).toHaveBeenCalledWith(expect.objectContaining({ pathname: 'api-keys' }));
  });

  it('navigates to privacy when the privacy tab is clicked', async () => {
    const user = userEvent.setup();
    renderMenu();
    await user.click(getPrivacyTab());
    expect(mockNavigate).toHaveBeenCalledWith(expect.objectContaining({ pathname: 'privacy' }));
  });
});
