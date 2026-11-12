import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { get, HttpError } from 'app-shared/utils/networking';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { GuidePage } from './GuidePage';

vi.mock('app-shared/utils/networking', async () => ({
  ...(await vi.importActual('app-shared/utils/networking')),
  get: vi.fn(),
}));

vi.mock('app-shared/contexts/EnvironmentConfigContext', () => ({
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
    vi.restoreAllMocks();
  });

  it('should redirect to / when user is authenticated', async () => {
    vi.mocked(get).mockResolvedValue({ login: 'testuser' });

    renderGuidePage();

    await waitFor(() => expect(window.location.href).toBe('/'));
  });

  it('should redirect to /login when guide is skipped', () => {
    localStorage.setItem('altinn-studio-skip-login-guide', 'true');

    renderGuidePage();

    expect(window.location.href).toBe('/login');
  });

  it('should show login guide when user is not authenticated and guide is not skipped', async () => {
    vi.mocked(get).mockRejectedValue(new HttpError({ status: 401, data: null }));

    renderGuidePage();

    expect(await screen.findByText(textMock('login_guide.q1_title'))).toBeInTheDocument();
  });
});

const renderGuidePage = () => render(<GuidePage />);
