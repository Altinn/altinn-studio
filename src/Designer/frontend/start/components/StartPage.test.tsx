import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StartPage } from './StartPage';

const mockUseEnvironmentConfig = jest.fn();
jest.mock('app-shared/contexts/EnvironmentConfigContext', () => ({
  useEnvironmentConfig: () => mockUseEnvironmentConfig(),
}));

const mockShouldSkipLoginGuide = jest.fn();
jest.mock('./LoginGuide', () => ({
  ...jest.requireActual('./LoginGuide'),
  shouldSkipLoginGuide: () => mockShouldSkipLoginGuide(),
}));

const originalLocation = window.location;

describe('StartPage', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...originalLocation, href: '' },
    });
    mockShouldSkipLoginGuide.mockReturnValue(false);
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: originalLocation,
    });
  });

  it('should show registration link when studioOidc is disabled', () => {
    mockUseEnvironmentConfig.mockReturnValue({
      environment: { featureFlags: { studioOidc: false } },
    });

    renderStartPage();

    expect(screen.getByRole('link', { name: 'Opprett ny bruker' })).toBeInTheDocument();
  });

  it('should not show registration link when studioOidc is enabled', () => {
    mockUseEnvironmentConfig.mockReturnValue({
      environment: { featureFlags: { studioOidc: true } },
    });

    renderStartPage();

    expect(screen.queryByRole('link', { name: 'Opprett ny bruker' })).not.toBeInTheDocument();
  });

  it('should show login button', () => {
    mockUseEnvironmentConfig.mockReturnValue({
      environment: { featureFlags: { studioOidc: true } },
    });

    renderStartPage();

    expect(screen.getByRole('button', { name: 'Logg inn' })).toBeInTheDocument();
  });

  it('should show login guide when studioOidc is enabled and login is clicked', async () => {
    const user = userEvent.setup();
    mockUseEnvironmentConfig.mockReturnValue({
      environment: { featureFlags: { studioOidc: true } },
    });

    renderStartPage();

    await user.click(screen.getByRole('button', { name: 'Logg inn' }));

    expect(screen.queryByRole('button', { name: 'Logg inn' })).not.toBeInTheDocument();
  });

  it('should redirect to /login when studioOidc is disabled and login is clicked', async () => {
    const user = userEvent.setup();
    mockUseEnvironmentConfig.mockReturnValue({
      environment: { featureFlags: { studioOidc: false } },
    });

    renderStartPage();

    await user.click(screen.getByRole('button', { name: 'Logg inn' }));

    expect(window.location.href).toBe('/login');
  });

  it('should redirect to /login when studioOidc is enabled but guide is skipped', async () => {
    const user = userEvent.setup();
    mockShouldSkipLoginGuide.mockReturnValue(true);
    mockUseEnvironmentConfig.mockReturnValue({
      environment: { featureFlags: { studioOidc: true } },
    });

    renderStartPage();

    await user.click(screen.getByRole('button', { name: 'Logg inn' }));

    expect(window.location.href).toBe('/login');
  });
});

const renderStartPage = () => render(<StartPage />);
