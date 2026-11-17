import type { ContactPoint, ContactPointPayload } from 'app-shared/types/ContactPoint';
import type { Person } from './PersonDialog/PersonDialog';

export const personToPayload = (person: Person): ContactPointPayload => ({
  name: person.name,
  isActive: person.isActive,
  environments: person.environments,
  reportFrequency: person.reportFrequency,
  methods: [
    ...(person.email ? [{ methodType: 'email' as const, value: person.email }] : []),
    ...(person.phone ? [{ methodType: 'sms' as const, value: person.phone }] : []),
  ],
});

export const contactPointToPerson = (cp: ContactPoint): Person => ({
  name: cp.name,
  isActive: cp.isActive,
  environments: cp.environments,
  reportFrequency: cp.reportFrequency,
  email: cp.methods.find((m) => m.methodType === 'email')?.value ?? '',
  phone: cp.methods.find((m) => m.methodType === 'sms')?.value ?? '',
});

// Mirrors PhoneNumber.TryNormalize in the backend: a number with a country code (+ or 00), where a Norwegian
// number must be a mobile number, or a Norwegian mobile number without one
export const isValidPhoneNumber = (phone: string): boolean =>
  /^(?:(?:\+|00)(?:47[49][0-9]{7}|(?!47)[1-9][0-9]{6,14})|[49][0-9]{7})$/.test(
    phone.replace(/[\s-]/g, ''),
  );
