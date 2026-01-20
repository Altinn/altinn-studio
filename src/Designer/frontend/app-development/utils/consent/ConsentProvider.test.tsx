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
});
