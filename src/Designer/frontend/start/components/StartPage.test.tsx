import { render, screen } from '@testing-library/react';
import { StartPage } from './StartPage';

const mockUseEnvironmentConfig = jest.fn();
jest.mock('app-shared/contexts/EnvironmentConfigContext', () => ({
  useEnvironmentConfig: () => mockUseEnvironmentConfig(),
}));

describe('StartPage', () => {
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
});

const renderStartPage = () => render(<StartPage />);
