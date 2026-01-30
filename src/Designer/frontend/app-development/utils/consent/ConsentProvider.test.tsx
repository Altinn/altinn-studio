import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConsentProvider, CONSENT_COOKIE_KEY, CONSENT_COOKIE_EXPIRY_DAYS } from './ConsentProvider';
import { useConsent, useConsentMutation } from '.';
import type { AnalyticsProvider } from './analyticsProvider';
import type { ConsentProviderProps } from './ConsentProvider';
import { CookieStorage } from '@studio/browser-storage';

jest.mock('@posthog/react', () => ({
  usePostHog: jest.fn(() => ({
    opt_in_capturing: jest.fn(),
    opt_out_capturing: jest.fn(),
    set_config: jest.fn(),
    startSessionRecording: jest.fn(),
    stopSessionRecording: jest.fn(),
  })),
}));

jest.mock('@studio/browser-storage', () => ({
  CookieStorage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
  },
}));

const TestComponent = () => {
  const { hasDecision, hasAnalyticsConsent, hasSessionRecordingConsent } = useConsent();
  const { grantAllConsent, denyAllConsent } = useConsentMutation();

  return (
    <div>
      <span data-testid='has-decision'>{String(hasDecision)}</span>
      <span data-testid='has-analytics'>{String(hasAnalyticsConsent)}</span>
      <span data-testid='has-recording'>{String(hasSessionRecordingConsent)}</span>
      <button onClick={grantAllConsent}>Grant All</button>
      <button onClick={denyAllConsent}>Deny All</button>
    </div>
  );
};

type ConsentStateExpectation = {
  decision: boolean;
  analytics: boolean;
  recording: boolean;
};

const expectConsentState = (expected: ConsentStateExpectation): void => {
  expect(screen.getByTestId('has-decision')).toHaveTextContent(String(expected.decision));
  expect(screen.getByTestId('has-analytics')).toHaveTextContent(String(expected.analytics));
  expect(screen.getByTestId('has-recording')).toHaveTextContent(String(expected.recording));
};

const mockStoredConsent = (analytics: boolean, sessionRecording: boolean): void => {
  (CookieStorage.getItem as jest.Mock).mockReturnValue({
    preferences: { analytics, sessionRecording },
    timestamp: Date.now(),
  });
};

const mockNoStoredConsent = (): void => {
  (CookieStorage.getItem as jest.Mock).mockReturnValue(null);
};

describe('useConsentContext', () => {
  it('should throw error when used outside ConsentProvider', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    const ThrowingComponent = () => {
      useConsent();
      return null;
    };

    expect(() => render(<ThrowingComponent />)).toThrow(
      'useConsent must be used within a ConsentProvider',
    );

    consoleErrorSpy.mockRestore();
  });
});

describe('useConsentMutationContext', () => {
  it('should throw error when used outside ConsentProvider', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    const ThrowingComponent = () => {
      useConsentMutation();
      return null;
    };

    expect(() => render(<ThrowingComponent />)).toThrow(
      'useConsentMutation must be used within a ConsentProvider',
    );

    consoleErrorSpy.mockRestore();
  });
});

describe('ConsentProvider', () => {
  const mockAnalyticsProvider: jest.Mocked<AnalyticsProvider> = {
    syncConsent: jest.fn(),
  };

  const renderConsentProvider = (props?: Partial<ConsentProviderProps>) => {
    const user = userEvent.setup();
    render(
      <ConsentProvider analyticsProvider={mockAnalyticsProvider} {...props}>
        <TestComponent />
      </ConsentProvider>,
    );
    return { user };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockNoStoredConsent();
  });

  it('should initialize with no decision when no cookie exists', () => {
    renderConsentProvider();

    expectConsentState({ decision: false, analytics: false, recording: false });
  });

  it('should use default PostHogAnalyticsProvider when no analyticsProvider is provided', () => {
    render(
      <ConsentProvider>
        <TestComponent />
      </ConsentProvider>,
    );

    expectConsentState({ decision: false, analytics: false, recording: false });
  });

  it('should initialize with existing consent from cookie', () => {
    mockStoredConsent(true, false);

    renderConsentProvider();

    expectConsentState({ decision: true, analytics: true, recording: false });
  });

  it('should sync consent with analytics provider on mount when consent exists', () => {
    mockStoredConsent(true, true);

    renderConsentProvider();

    expect(mockAnalyticsProvider.syncConsent).toHaveBeenCalledWith({
      analytics: true,
      sessionRecording: true,
    });
  });

  it('should save consent preferences to cookie when granting all', async () => {
    const fixedTimestamp = 12345;
    const { user } = renderConsentProvider({ getCurrentTimestamp: () => fixedTimestamp });

    await user.click(screen.getByRole('button', { name: /grant all/i }));

    expect(CookieStorage.setItem).toHaveBeenCalledWith(
      CONSENT_COOKIE_KEY,
      {
        preferences: { analytics: true, sessionRecording: true },
        timestamp: fixedTimestamp,
      },
      {
        expires: CONSENT_COOKIE_EXPIRY_DAYS,
        sameSite: 'Lax',
        secure: true,
      },
    );
    expectConsentState({ decision: true, analytics: true, recording: true });
  });

  it('should save consent preferences to cookie when denying all', async () => {
    const fixedTimestamp = 12345;
    const { user } = renderConsentProvider({ getCurrentTimestamp: () => fixedTimestamp });

    await user.click(screen.getByRole('button', { name: /deny all/i }));

    expect(CookieStorage.setItem).toHaveBeenCalledWith(
      CONSENT_COOKIE_KEY,
      {
        preferences: { analytics: false, sessionRecording: false },
        timestamp: fixedTimestamp,
      },
      {
        expires: CONSENT_COOKIE_EXPIRY_DAYS,
        sameSite: 'Lax',
        secure: true,
      },
    );
    expectConsentState({ decision: true, analytics: false, recording: false });
  });

  it('should sync consent with analytics provider when user grants all', async () => {
    const { user } = renderConsentProvider();

    await user.click(screen.getByRole('button', { name: /grant all/i }));

    expect(mockAnalyticsProvider.syncConsent).toHaveBeenCalledWith({
      analytics: true,
      sessionRecording: true,
    });
  });

  it('should log error but not crash when analytics provider syncConsent fails', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    const syncError = new Error('Sync failed');
    mockAnalyticsProvider.syncConsent.mockImplementation(() => {
      throw syncError;
    });
    mockStoredConsent(true, true);

    renderConsentProvider();

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to sync consent with analytics provider:',
      syncError,
    );
    expectConsentState({ decision: true, analytics: true, recording: true });

    consoleErrorSpy.mockRestore();
  });

  it('should not sync consent with analytics provider when no consent exists', () => {
    renderConsentProvider();

    expect(mockAnalyticsProvider.syncConsent).not.toHaveBeenCalled();
  });

  it('should treat malformed cookie as no decision', () => {
    (CookieStorage.getItem as jest.Mock).mockReturnValue({
      preferences: { analytics: 'not-a-boolean' },
      timestamp: 'invalid',
    });

    renderConsentProvider();

    expectConsentState({ decision: false, analytics: false, recording: false });
  });

  it('should treat cookie with missing preferences as no decision', () => {
    (CookieStorage.getItem as jest.Mock).mockReturnValue({
      timestamp: Date.now(),
    });

    renderConsentProvider();

    expectConsentState({ decision: false, analytics: false, recording: false });
  });

  it('should handle CookieStorage.getItem throwing an error', () => {
    (CookieStorage.getItem as jest.Mock).mockImplementation(() => {
      throw new Error('Cookie read failed');
    });

    renderConsentProvider();

    expectConsentState({ decision: false, analytics: false, recording: false });
  });

  it('should log error and not update state when CookieStorage.setItem fails', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    const storageError = new Error('Storage full');
    (CookieStorage.setItem as jest.Mock).mockImplementation(() => {
      throw storageError;
    });

    const errorHandler = jest.fn();
    window.addEventListener('error', errorHandler);

    const { user } = renderConsentProvider();

    await user.click(screen.getByRole('button', { name: /grant all/i }));

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Failed to save consent preferences:',
      storageError,
    );
    expectConsentState({ decision: false, analytics: false, recording: false });

    window.removeEventListener('error', errorHandler);
    consoleErrorSpy.mockRestore();
  });
});
