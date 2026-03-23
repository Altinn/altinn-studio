import { render, screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { GuidePage } from './GuidePage';

const mockUseUserQuery = jest.fn();
jest.mock('app-shared/hooks/queries/useUserQuery', () => ({
  useUserQuery: () => mockUseUserQuery(),
}));

jest.mock('app-shared/contexts/EnvironmentConfigContext', () => ({
  useEnvironmentConfig: () => ({ environment: {} }),
}));

const originalLocation = window.location;

describe('GuidePage', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...originalLocation, href: '' },
    });
    localStorage.clear();
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: originalLocation,
    });
  });

  it('should redirect to / when user is authenticated', () => {
    mockUseUserQuery.mockReturnValue({ data: { login: 'testuser' } });

    renderGuidePage();

    expect(window.location.href).toBe('/');
  });

  it('should redirect to /login when guide is skipped', () => {
    mockUseUserQuery.mockReturnValue({ data: undefined });
    localStorage.setItem('altinn-studio-skip-login-guide', 'true');

    renderGuidePage();

    expect(window.location.href).toBe('/login');
  });

  it('should show login guide when user is not authenticated and guide is not skipped', () => {
    mockUseUserQuery.mockReturnValue({ data: undefined });

    renderGuidePage();

    expect(screen.getByText(textMock('login_guide.q1_title'))).toBeInTheDocument();
  });
});

const renderGuidePage = () => render(<GuidePage />);
