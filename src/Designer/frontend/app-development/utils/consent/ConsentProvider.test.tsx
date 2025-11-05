import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { ConsentProvider } from './ConsentProvider';
import { useConsent, useConsentMutation } from '.';
import type { AnalyticsProvider } from './analyticsProvider';
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
      <div data-testid='has-decision'>{String(hasDecision)}</div>
      <div data-testid='has-analytics'>{String(hasAnalyticsConsent)}</div>
      <div data-testid='has-recording'>{String(hasSessionRecordingConsent)}</div>
      <button onClick={grantAllConsent} data-testid='grant-all'>
        Grant All
      </button>
      <button onClick={denyAllConsent} data-testid='deny-all'>
        Deny All
      </button>
    </div>
  );
};

describe('ConsentProvider', () => {
  let mockAnalyticsProvider: jest.Mocked<AnalyticsProvider>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockAnalyticsProvider = {
      syncConsent: jest.fn(),
    };
    (CookieStorage.getItem as jest.Mock).mockReturnValue(null);
  });

  it('should initialize with no decision when no cookie exists', () => {
    const { getByTestId } = render(
      <ConsentProvider analyticsProvider={mockAnalyticsProvider}>
        <TestComponent />
      </ConsentProvider>,
    );

    expect(getByTestId('has-decision')).toHaveTextContent('false');
    expect(getByTestId('has-analytics')).toHaveTextContent('false');
    expect(getByTestId('has-recording')).toHaveTextContent('false');
  });

  it('should initialize with existing consent from cookie', () => {
    (CookieStorage.getItem as jest.Mock).mockReturnValue({
      preferences: { analytics: true, sessionRecording: false },
      timestamp: Date.now(),
    });

    const { getByTestId } = render(
      <ConsentProvider analyticsProvider={mockAnalyticsProvider}>
        <TestComponent />
      </ConsentProvider>,
    );

    expect(getByTestId('has-decision')).toHaveTextContent('true');
    expect(getByTestId('has-analytics')).toHaveTextContent('true');
    expect(getByTestId('has-recording')).toHaveTextContent('false');
  });

  it('should sync consent with analytics provider on mount when consent exists', async () => {
    (CookieStorage.getItem as jest.Mock).mockReturnValue({
      preferences: { analytics: true, sessionRecording: true },
      timestamp: Date.now(),
    });

    render(
      <ConsentProvider analyticsProvider={mockAnalyticsProvider}>
        <TestComponent />
      </ConsentProvider>,
    );

    await waitFor(() => {
      expect(mockAnalyticsProvider.syncConsent).toHaveBeenCalledWith({
        analytics: true,
        sessionRecording: true,
      });
    });
  });

  it('should save consent preferences to cookie when granting all', async () => {
    const { getByTestId } = render(
      <ConsentProvider analyticsProvider={mockAnalyticsProvider} getCurrentTimestamp={() => 12345}>
        <TestComponent />
      </ConsentProvider>,
    );

    const grantAllButton = getByTestId('grant-all');
    grantAllButton.click();

    await waitFor(() => {
      expect(CookieStorage.setItem).toHaveBeenCalledWith(
        'altinn-studio-consent',
        {
          preferences: { analytics: true, sessionRecording: true },
          timestamp: 12345,
        },
        {
          expires: 365,
          sameSite: 'Lax',
          secure: true,
        },
      );
    });

    expect(getByTestId('has-decision')).toHaveTextContent('true');
    expect(getByTestId('has-analytics')).toHaveTextContent('true');
    expect(getByTestId('has-recording')).toHaveTextContent('true');
  });

  it('should save consent preferences to cookie when denying all', async () => {
    const { getByTestId } = render(
      <ConsentProvider analyticsProvider={mockAnalyticsProvider} getCurrentTimestamp={() => 12345}>
        <TestComponent />
      </ConsentProvider>,
    );

    const denyAllButton = getByTestId('deny-all');
    denyAllButton.click();

    await waitFor(() => {
      expect(CookieStorage.setItem).toHaveBeenCalledWith(
        'altinn-studio-consent',
        {
          preferences: { analytics: false, sessionRecording: false },
          timestamp: 12345,
        },
        {
          expires: 365,
          sameSite: 'Lax',
          secure: true,
        },
      );
    });

    expect(getByTestId('has-decision')).toHaveTextContent('true');
    expect(getByTestId('has-analytics')).toHaveTextContent('false');
    expect(getByTestId('has-recording')).toHaveTextContent('false');
  });

  it('should sync consent with analytics provider when preferences change', async () => {
    const { getByTestId } = render(
      <ConsentProvider analyticsProvider={mockAnalyticsProvider}>
        <TestComponent />
      </ConsentProvider>,
    );

    const grantAllButton = getByTestId('grant-all');
    grantAllButton.click();

    await waitFor(() => {
      expect(mockAnalyticsProvider.syncConsent).toHaveBeenCalledWith({
        analytics: true,
        sessionRecording: true,
      });
    });
  });
});
