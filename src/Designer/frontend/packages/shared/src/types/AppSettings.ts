export type AppSettings = {
  undeployOnInactivity: boolean | null;
  inactivityPeriodDays: number | null;
  orgUndeployOnInactivity: boolean;
  orgInactivityPeriodDays: number;
};

export type AppSettingsPayload = Pick<AppSettings, 'undeployOnInactivity' | 'inactivityPeriodDays'>;
