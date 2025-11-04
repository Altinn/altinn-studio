export type ConsentStatus = 'granted' | 'denied' | 'pending';

export interface ConsentPreferences {
  analytics: boolean;
  sessionRecording: boolean;
}

export interface ConsentState {
  preferences: ConsentPreferences;
  timestamp: number;
}
