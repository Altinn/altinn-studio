import type { PostHog } from 'posthog-js';
import type { ConsentPreferences } from './types';

export interface AnalyticsProvider {
  syncConsent(preferences: ConsentPreferences): void;
}

export class PostHogAnalyticsProvider implements AnalyticsProvider {
  constructor(private posthog: PostHog) {}

  public syncConsent(preferences: ConsentPreferences): void {
    if (!this.posthog) return;

    const analyticsEnabled = preferences.analytics;
    const sessionRecordingEnabled = analyticsEnabled && preferences.sessionRecording;

    this.syncAnalyticsConsent(analyticsEnabled);
    this.syncSessionRecording(sessionRecordingEnabled);
  }

  private syncAnalyticsConsent(enabled: boolean): void {
    if (enabled) {
      this.posthog.opt_in_capturing();
      this.posthog.set_config({
        persistence: 'localStorage+cookie',
        autocapture: true,
        capture_pageview: true,
        capture_pageleave: true,
      });
    } else {
      this.posthog.opt_out_capturing();
      this.posthog.set_config({
        persistence: 'memory',
        autocapture: false,
        capture_pageview: false,
        capture_pageleave: false,
      });
    }
  }

  private syncSessionRecording(enabled: boolean): void {
    if (enabled) {
      this.posthog.startSessionRecording();
      this.posthog.set_config({
        disable_session_recording: false,
      });
    } else {
      this.posthog.stopSessionRecording();
      this.posthog.set_config({
        disable_session_recording: true,
      });
    }
  }
}
