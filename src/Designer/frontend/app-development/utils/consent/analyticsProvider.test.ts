import { PostHogAnalyticsProvider } from './analyticsProvider';
import type { PostHog } from 'posthog-js';

describe('PostHogAnalyticsProvider', () => {
  let mockPostHog: jest.Mocked<PostHog>;
  let provider: PostHogAnalyticsProvider;

  beforeEach(() => {
    mockPostHog = {
      opt_in_capturing: jest.fn(),
      opt_out_capturing: jest.fn(),
      set_config: jest.fn(),
      startSessionRecording: jest.fn(),
      stopSessionRecording: jest.fn(),
    } as unknown as jest.Mocked<PostHog>;

    provider = new PostHogAnalyticsProvider(mockPostHog);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('syncConsent', () => {
    it('should opt in and enable features when analytics is enabled', () => {
      provider.syncConsent({ analytics: true, sessionRecording: false });

      expect(mockPostHog.opt_in_capturing).toHaveBeenCalled();
      expect(mockPostHog.set_config).toHaveBeenCalledWith({
        persistence: 'localStorage+cookie',
        autocapture: true,
        capture_pageview: true,
        capture_pageleave: true,
      });
    });

    it('should opt out and disable features when analytics is disabled', () => {
      provider.syncConsent({ analytics: false, sessionRecording: false });

      expect(mockPostHog.opt_out_capturing).toHaveBeenCalled();
      expect(mockPostHog.set_config).toHaveBeenCalledWith({
        persistence: 'memory',
        autocapture: false,
        capture_pageview: false,
        capture_pageleave: false,
      });
    });

    it('should start session recording when enabled', () => {
      provider.syncConsent({ analytics: true, sessionRecording: true });

      expect(mockPostHog.startSessionRecording).toHaveBeenCalled();
      expect(mockPostHog.set_config).toHaveBeenCalledWith({
        disable_session_recording: false,
      });
    });

    it('should stop session recording when disabled', () => {
      provider.syncConsent({ analytics: true, sessionRecording: false });

      expect(mockPostHog.stopSessionRecording).toHaveBeenCalled();
      expect(mockPostHog.set_config).toHaveBeenCalledWith({
        disable_session_recording: true,
      });
    });

    it('should handle both analytics and session recording being enabled', () => {
      provider.syncConsent({ analytics: true, sessionRecording: true });

      expect(mockPostHog.opt_in_capturing).toHaveBeenCalled();
      expect(mockPostHog.startSessionRecording).toHaveBeenCalled();
      expect(mockPostHog.set_config).toHaveBeenCalledWith(
        expect.objectContaining({ autocapture: true }),
      );
      expect(mockPostHog.set_config).toHaveBeenCalledWith(
        expect.objectContaining({ disable_session_recording: false }),
      );
    });

    it('should handle both analytics and session recording being disabled', () => {
      provider.syncConsent({ analytics: false, sessionRecording: false });

      expect(mockPostHog.opt_out_capturing).toHaveBeenCalled();
      expect(mockPostHog.stopSessionRecording).toHaveBeenCalled();
      expect(mockPostHog.set_config).toHaveBeenCalledWith(
        expect.objectContaining({ autocapture: false }),
      );
      expect(mockPostHog.set_config).toHaveBeenCalledWith(
        expect.objectContaining({ disable_session_recording: true }),
      );
    });

    it('should do nothing if posthog instance is null', () => {
      const nullProvider = new PostHogAnalyticsProvider(null as unknown as PostHog);

      expect(() => {
        nullProvider.syncConsent({ analytics: true, sessionRecording: true });
      }).not.toThrow();
    });

    it('should disable session recording when analytics is false, even if sessionRecording is true', () => {
      provider.syncConsent({ analytics: false, sessionRecording: true });

      expect(mockPostHog.opt_out_capturing).toHaveBeenCalled();
      expect(mockPostHog.stopSessionRecording).toHaveBeenCalled();
      expect(mockPostHog.set_config).toHaveBeenCalledWith(
        expect.objectContaining({ disable_session_recording: true }),
      );
      expect(mockPostHog.startSessionRecording).not.toHaveBeenCalled();
    });
  });
});
