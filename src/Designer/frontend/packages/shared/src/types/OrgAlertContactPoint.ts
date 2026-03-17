export enum AlertSeverity {
  None = 0,
  Critical = 1,
  WarningAndCritical = 2,
  All = 3,
}

export type OrgAlertPerson = {
  id: string;
  name: string;
  email?: string;
  emailSeverity: AlertSeverity;
  phone?: string;
  smsSeverity: AlertSeverity;
  isActive: boolean;
  services: string[] | null;
};

export type OrgAlertSlackChannel = {
  id: string;
  channelName: string;
  slackId: string;
  severity: AlertSeverity;
  isActive: boolean;
  services: string[] | null;
};

export type OrgAlertPersonPayload = Omit<OrgAlertPerson, 'id'>;
export type OrgAlertSlackChannelPayload = Omit<OrgAlertSlackChannel, 'id'>;
