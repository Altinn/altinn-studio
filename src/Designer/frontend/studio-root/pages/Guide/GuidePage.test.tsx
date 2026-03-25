import { render, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { GuidePage } from './GuidePage';

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
    jest.restoreAllMocks();
  });

  it('should redirect to / when user is authenticated', async () => {
    jest.spyOn(axios, 'get').mockResolvedValue({ data: { login: 'testuser' } });

    renderGuidePage();

    await waitFor(() => expect(window.location.href).toBe('/'));
  });

  it('should redirect to /login when guide is skipped', () => {
    localStorage.setItem('altinn-studio-skip-login-guide', 'true');

    renderGuidePage();

    expect(window.location.href).toBe('/login');
  });

  it('should show login guide when user is not authenticated and guide is not skipped', async () => {
    jest.spyOn(axios, 'get').mockRejectedValue({ response: { status: 401 } });

    renderGuidePage();

    expect(await screen.findByText(textMock('login_guide.q1_title'))).toBeInTheDocument();
  });
});

const renderGuidePage = () => render(<GuidePage />);
