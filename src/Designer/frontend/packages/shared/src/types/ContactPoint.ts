export type ContactMethodType = 'email' | 'sms' | 'slack_webhook';

export type ContactMethod = {
  id: string;
  methodType: ContactMethodType;
  value: string;
};

export type ContactPoint = {
  id: string;
  name: string;
  isActive: boolean;
  methods: ContactMethod[];
};

export type ContactPointPayload = Omit<ContactPoint, 'id' | 'methods'> & {
  methods: Omit<ContactMethod, 'id'>[];
};
