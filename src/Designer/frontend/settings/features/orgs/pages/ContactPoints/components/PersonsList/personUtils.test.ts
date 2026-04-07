import { personToPayload, contactPointToPerson } from './personUtils';
import type { Person } from './PersonDialog/PersonDialog';
import type { ContactPoint } from 'app-shared/types/ContactPoint';

const personWithBoth: Person = {
  name: 'Test Person',
  isActive: true,
  environments: ['tt02', 'production'],
  email: 'test@example.com',
  phone: '12345678',
};

const personEmailOnly: Person = {
  name: 'Email Only',
  isActive: false,
  environments: ['tt02'],
  email: 'email@example.com',
  phone: '',
};

const personPhoneOnly: Person = {
  name: 'Phone Only',
  isActive: true,
  environments: [],
  email: '',
  phone: '87654321',
};

const personNoMethods: Person = {
  name: 'No Methods',
  isActive: true,
  environments: [],
  email: '',
  phone: '',
};

describe('personToPayload', () => {
  it('maps name, isActive, and environments', () => {
    const result = personToPayload(personWithBoth);
    expect(result.name).toBe('Test Person');
    expect(result.isActive).toBe(true);
    expect(result.environments).toEqual(['tt02', 'production']);
  });

  it('includes both email and sms methods when both are provided', () => {
    const result = personToPayload(personWithBoth);
    expect(result.methods).toEqual([
      { methodType: 'email', value: 'test@example.com' },
      { methodType: 'sms', value: '12345678' },
    ]);
  });

  it('includes only email method when phone is empty', () => {
    const result = personToPayload(personEmailOnly);
    expect(result.methods).toEqual([{ methodType: 'email', value: 'email@example.com' }]);
  });

  it('includes only sms method when email is empty', () => {
    const result = personToPayload(personPhoneOnly);
    expect(result.methods).toEqual([{ methodType: 'sms', value: '87654321' }]);
  });

  it('returns empty methods array when both email and phone are empty', () => {
    const result = personToPayload(personNoMethods);
    expect(result.methods).toEqual([]);
  });
});

const contactPointWithBoth: ContactPoint = {
  id: 'cp-1',
  name: 'Contact Point',
  isActive: true,
  environments: ['tt02'],
  methods: [
    { id: 'm1', methodType: 'email', value: 'cp@example.com' },
    { id: 'm2', methodType: 'sms', value: '11111111' },
  ],
};

const contactPointEmailOnly: ContactPoint = {
  id: 'cp-2',
  name: 'Email Only',
  isActive: false,
  environments: [],
  methods: [{ id: 'm3', methodType: 'email', value: 'only@example.com' }],
};

const contactPointNoMethods: ContactPoint = {
  id: 'cp-3',
  name: 'No Methods',
  isActive: true,
  environments: [],
  methods: [],
};

describe('contactPointToPerson', () => {
  it('maps name, isActive, and environments', () => {
    const result = contactPointToPerson(contactPointWithBoth);
    expect(result.name).toBe('Contact Point');
    expect(result.isActive).toBe(true);
    expect(result.environments).toEqual(['tt02']);
  });

  it('maps email and phone when both methods are present', () => {
    const result = contactPointToPerson(contactPointWithBoth);
    expect(result.email).toBe('cp@example.com');
    expect(result.phone).toBe('11111111');
  });

  it('maps email and falls back to empty string for phone when only email method exists', () => {
    const result = contactPointToPerson(contactPointEmailOnly);
    expect(result.email).toBe('only@example.com');
    expect(result.phone).toBe('');
  });

  it('falls back to empty strings for both email and phone when no methods exist', () => {
    const result = contactPointToPerson(contactPointNoMethods);
    expect(result.email).toBe('');
    expect(result.phone).toBe('');
  });
});
