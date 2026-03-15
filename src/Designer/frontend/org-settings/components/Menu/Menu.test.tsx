import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Menu } from './Menu';
import { renderWithProviders } from '../../testing/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const renderMenu = (initialEntries: string[] = ['/api-keys']) =>
  renderWithProviders(<Menu />, { initialEntries });

const getTab = () =>
  screen.getByRole('tab', {
    name: textMock('org.settings.contact_points.contact_points'),
  });

describe('Menu', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders the api keys tab', () => {
    renderMenu();
    expect(getTab()).toBeInTheDocument();
  });

  it('selects contact points tab when pathname ends with empty string', () => {
    renderMenu(['/settings/']);
    expect(getTab()).toHaveAttribute('tabindex', '0');
  });

  it('navigates to tab when a tab is clicked', async () => {
    const user = userEvent.setup();
    renderMenu(['/contact-points']);
    await user.click(getTab());
    expect(mockNavigate).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: 'contact-points' }),
    );
  });
});
