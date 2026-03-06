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

const renderMenu = (initialEntries: string[] = ['/personal-access-tokens']) =>
  renderWithProviders(<Menu />, { initialEntries });

const getTab = () =>
  screen.getByRole('tab', {
    name: textMock('user.settings.personal_access_tokens.personal_access_tokens'),
  });

describe('Menu', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders the personal access tokens tab', () => {
    renderMenu();
    expect(getTab()).toBeInTheDocument();
  });

  it('navigates preserving search params when a tab is clicked', async () => {
    const user = userEvent.setup();
    renderMenu(['/personal-access-tokens?returnTo=%2Fdashboard']);
    await user.click(getTab());
    expect(mockNavigate).toHaveBeenCalledWith(
      expect.objectContaining({ search: '?returnTo=%2Fdashboard' }),
    );
  });
});
