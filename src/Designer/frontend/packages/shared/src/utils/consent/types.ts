export type ConsentPreferences = {
  analytics: boolean;
  sessionRecording: boolean;
};

export type ConsentState = {
  preferences: ConsentPreferences;
  timestamp: number;
};

export type StoredConsentState = Partial<Omit<ConsentState, 'preferences'>> & {
  preferences?: Partial<ConsentPreferences>;
};
