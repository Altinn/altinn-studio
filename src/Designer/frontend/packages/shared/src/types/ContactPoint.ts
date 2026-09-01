export type ContactMethodType = 'email' | 'sms' | 'slack';

export type ContactMethod = {
  id: string;
  methodType: ContactMethodType;
  value: string;
};

export type ReportFrequency = 'none' | 'daily' | 'weekly' | 'monthly';

export type ContactPoint = {
  id: string;
  name: string;
  isActive: boolean;
  environments: string[];
  methods: ContactMethod[];
  reportFrequency: ReportFrequency;
};

export type ContactPointPayload = Omit<ContactPoint, 'id' | 'methods'> & {
  methods: Omit<ContactMethod, 'id'>[];
};
