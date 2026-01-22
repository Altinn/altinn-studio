export type ConsentPreferences = {
  analytics: boolean;
  sessionRecording: boolean;
};

export type ConsentState = {
  preferences: ConsentPreferences;
  timestamp: number;
};
