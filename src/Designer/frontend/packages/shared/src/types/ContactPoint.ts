export type ContactMethodType = 'email' | 'sms' | 'slack';

export type ContactMethod = {
  id: string;
  methodType: ContactMethodType;
  value: string;
};

export type ContactPoint = {
  id: string;
  name: string;
  isActive: boolean;
  environments: string[];
  methods: ContactMethod[];
};

export type ContactPointPayload = Omit<ContactPoint, 'id' | 'methods'> & {
  methods: Omit<ContactMethod, 'id'>[];
};
