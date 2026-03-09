import React from 'react';
import { screen } from '@testing-library/react';
import { PageLayout } from './PageLayout';
import { renderWithProviders } from '../../testing/mocks';
import { textMock } from '@studio/testing/mocks/i18nMock';

jest.mock('../../components/Menu/Menu', () => ({ Menu: () => <div>Menu</div> }));
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  Outlet: () => <div>Outlet</div>,
}));
jest.mock('app-shared/contexts/EnvironmentConfigContext', () => ({
  useEnvironmentConfig: () => ({ environment: {} }),
}));

const renderPageLayout = (initialEntries: string[] = ['/']) =>
  renderWithProviders(<PageLayout />, { initialEntries });

describe('PageLayout', () => {
  it('renders the settings heading', () => {
    renderPageLayout();
    expect(screen.getByText(textMock('user.settings'))).toBeInTheDocument();
  });
});
