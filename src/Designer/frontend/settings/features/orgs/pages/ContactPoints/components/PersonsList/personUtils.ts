import type { ContactPoint, ContactPointPayload } from 'app-shared/types/ContactPoint';
import type { Person } from './PersonDialog/PersonDialog';

export const personToPayload = (person: Person): ContactPointPayload => ({
  name: person.name,
  isActive: person.isActive,
  environments: person.environments,
  methods: [
    ...(person.email ? [{ methodType: 'email' as const, value: person.email }] : []),
    ...(person.phone ? [{ methodType: 'sms' as const, value: person.phone }] : []),
  ],
});

export const contactPointToPerson = (cp: ContactPoint): Person => ({
  name: cp.name,
  isActive: cp.isActive,
  environments: cp.environments,
  email: cp.methods.find((m) => m.methodType === 'email')?.value ?? '',
  phone: cp.methods.find((m) => m.methodType === 'sms')?.value ?? '',
});
