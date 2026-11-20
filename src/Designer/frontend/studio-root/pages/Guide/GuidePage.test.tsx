import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { get } from 'app-shared/utils/networking';
import { textMock } from '@designer/testing/mocks/i18nMock';
import { GuidePage } from './GuidePage';
import { createHttpErrorMock } from 'app-shared/mocks/httpErrorMock';

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
    vi.mocked(get).mockRejectedValue(createHttpErrorMock(401, null));

    renderGuidePage();

    expect(await screen.findByText(textMock('login_guide.q1_title'))).toBeInTheDocument();
  });
});

const renderGuidePage = () => render(<GuidePage />);
