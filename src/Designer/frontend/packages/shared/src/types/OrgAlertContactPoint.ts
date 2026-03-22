export type ContactMethodType = 'email' | 'sms' | 'slack_webhook';

export type ContactMethod = {
  id: string;
  methodType: ContactMethodType;
  value: string;
};

export type OrgAlertContactPoint = {
  id: string;
  name: string;
  isActive: boolean;
  methods: ContactMethod[];
};

export type OrgAlertContactPointPayload = Omit<OrgAlertContactPoint, 'id' | 'methods'> & {
  methods: Omit<ContactMethod, 'id'>[];
};
