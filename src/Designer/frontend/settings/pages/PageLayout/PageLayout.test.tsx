import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PageLayout } from './PageLayout';
import { renderWithProviders } from '../../testing/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';

jest.mock('../../components/Menu/Menu', () => ({ Menu: () => <div>Menu</div> }));
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  Outlet: () => <div>Outlet</div>,
}));

const renderPageLayout = (initialEntries: string[] = ['/']) =>
  renderWithProviders(<PageLayout />, { initialEntries });

describe('PageLayout', () => {
  it('renders the settings heading', () => {
    renderPageLayout();
    expect(screen.getByText(textMock('user.settings'))).toBeInTheDocument();
  });

  it('always renders the back button', () => {
    renderPageLayout(['/']);
    expect(
      screen.getByRole('button', { name: textMock('shared.header_go_back') }),
    ).toBeInTheDocument();
  });

  it('navigates to returnTo url when back button is clicked', async () => {
    const user = userEvent.setup();
    const locationMock = { href: '' };
    Object.defineProperty(window, 'location', { configurable: true, value: locationMock });

    renderPageLayout(['/?returnTo=%2Fdashboard']);
    await user.click(screen.getByRole('button', { name: textMock('shared.header_go_back') }));

    expect(locationMock.href).toBe('/dashboard');
  });

  it('navigates to / when no returnTo param is set', async () => {
    const user = userEvent.setup();
    const locationMock = { href: '' };
    Object.defineProperty(window, 'location', { configurable: true, value: locationMock });

    renderPageLayout(['/']);
    await user.click(screen.getByRole('button', { name: textMock('shared.header_go_back') }));

    expect(locationMock.href).toBe('/');
  });

  it('navigates to / when returnTo is an absolute external URL', async () => {
    const user = userEvent.setup();
    const locationMock = { href: '' };
    Object.defineProperty(window, 'location', { configurable: true, value: locationMock });

    renderPageLayout(['/?returnTo=https%3A%2F%2Fexternal.example']);
    await user.click(screen.getByRole('button', { name: textMock('shared.header_go_back') }));

    expect(locationMock.href).toBe('/');
  });

  it('navigates to / when returnTo is a relative URL', async () => {
    const user = userEvent.setup();
    const locationMock = { href: '' };
    Object.defineProperty(window, 'location', { configurable: true, value: locationMock });

    renderPageLayout(['/?returnTo=%2F%2Fexternal.example']);
    await user.click(screen.getByRole('button', { name: textMock('shared.header_go_back') }));

    expect(locationMock.href).toBe('/');
  });
});
