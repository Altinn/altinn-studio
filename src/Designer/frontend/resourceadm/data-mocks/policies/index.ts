import type {
  PolicyAction,
  Policy,
  PolicyRule,
  PolicyRuleResource,
  PolicySubject,
} from '@altinn/policy-editor';

// RESOURCE ID
export const resourceIdMock1: string = 'resource_id_1';
export const resourceIdMock2: string = 'resource_id_2';
export const resourceIdMock3: string = 'resourceId3';

// RESOURCE TYPE
export const resourceTypeMock1: string = 'urn:altinn:resource';
export const resourceTypeMock2: string = 'urn:altinn:resource2';
export const resourceTypeMock3: string = 'urn:altinn:resource3';

// RESOURCES
const resourceMock1: PolicyRuleResource = {
  type: resourceTypeMock1,
  id: resourceIdMock1,
};
const resourceMock2: PolicyRuleResource = {
  type: resourceTypeMock2,
  id: resourceIdMock2,
};

// SUBJECT STRINGS FROM BACKEND
export const subjectStringBackendMock1: string = 'urn:altinn:rolecode:dagl';
export const subjectStringBackendMock3: string = 'urn:altinn:rolecode:dagl3';

// RULES
const ruleMock1: PolicyRule = {
  ruleId: `${resourceTypeMock1}:${resourceIdMock1}:ruleid:1`,
  resources: [
    [`${resourceMock1.type}:${resourceMock1.id}`, `${resourceMock2.type}:${resourceMock2.id}`],
  ],
  actions: ['read', 'write'],
  subject: [subjectStringBackendMock1, subjectStringBackendMock3],
  description: 'Dette er en forklaring på hva regelen er.',
};

// POLICIES
export const policyMock1: Policy = {
  rules: [ruleMock1],
  requiredAuthenticationLevelEndUser: '3',
  requiredAuthenticationLevelOrg: '4',
};

export const policyMock2: Policy = {
  rules: [],
  requiredAuthenticationLevelEndUser: '3',
  requiredAuthenticationLevelOrg: '4',
};

// ACTIONS
const actionMock1: PolicyAction = {
  actionId: 'read',
  actionTitle: 'Les',
  actionDescription: null,
};

const actionMock2: PolicyAction = {
  actionId: 'write',
  actionTitle: 'Skriv',
  actionDescription: null,
};

const actionMock3: PolicyAction = {
  actionId: 'delete',
  actionTitle: 'Slett',
  actionDescription: null,
};

const actionMock4: PolicyAction = {
  actionId: 'confirm',
  actionTitle: 'Bekreft',
  actionDescription: null,
};

const actionMock5: PolicyAction = {
  actionId: 'sign',
  actionTitle: 'Sign',
  actionDescription: null,
};

export const actionsListMock = [actionMock1, actionMock2, actionMock3, actionMock4, actionMock5];

// SUBJECTS
export const subjectMock1: PolicySubject = {
  subjectId: 'dagl',
  subjectSource: 'altinn:role',
  subjectTitle: 'Daglig leder',
  subjectDescription: 'Daglig leder fra enhetsregisteret',
};

const subjectMock2: PolicySubject = {
  subjectId: 'dagl2',
  subjectSource: 'altinn:role',
  subjectTitle: 'Daglig leder 2',
  subjectDescription: 'Daglig leder fra enhetsregisteret',
};

const subjectMock3: PolicySubject = {
  subjectId: 'dagl3',
  subjectSource: 'altinn:role',
  subjectTitle: 'Daglig leder 3',
  subjectDescription: 'Daglig leder fra enhetsregisteret',
};

const subjectMock4: PolicySubject = {
  subjectId: 'dagl4',
  subjectSource: 'altinn:role',
  subjectTitle: 'Daglig leder 4',
  subjectDescription: 'Daglig leder fra enhetsregisteret',
};

const subjectMock5: PolicySubject = {
  subjectId: 'dagl5',
  subjectSource: 'altinn:role',
  subjectTitle: 'Daglig leder 5',
  subjectDescription: 'Daglig leder fra enhetsregisteret',
};

const subjectMock6: PolicySubject = {
  subjectId: 'dagl 6',
  subjectSource: 'altinn:role',
  subjectTitle: 'Daglig leder 6',
  subjectDescription: 'Daglig leder fra enhetsregisteret',
};

const subjectMock7: PolicySubject = {
  subjectId: 'dagl7',
  subjectSource: 'altinn:role',
  subjectTitle: 'Daglig leder 7',
  subjectDescription: 'Daglig leder fra enhetsregisteret',
};

const subjectMock8: PolicySubject = {
  subjectId: 'dagl8',
  subjectSource: 'altinn:role',
  subjectTitle: 'Daglig leder 8',
  subjectDescription: 'Daglig leder fra enhetsregisteret',
};

const subjectMock9: PolicySubject = {
  subjectId: 'dagl9',
  subjectSource: 'altinn:role',
  subjectTitle: 'Daglig leder 9',
  subjectDescription: 'Daglig leder fra enhetsregisteret',
};

const subjectMock10: PolicySubject = {
  subjectId: 'dagl10',
  subjectSource: 'altinn:role',
  subjectTitle: 'Daglig leder 10',
  subjectDescription: 'Daglig leder fra enhetsregisteret',
};

const subjectMock11: PolicySubject = {
  subjectId: 'ADMAI',
  subjectSource: 'altinn:rolecode',
  subjectTitle: 'ADMAI from backend',
  subjectDescription: 'ADMAI from backen',
};

export const subjectsListMock: PolicySubject[] = [
  subjectMock1,
  subjectMock2,
  subjectMock3,
  subjectMock4,
  subjectMock5,
  subjectMock6,
  subjectMock7,
  subjectMock8,
  subjectMock9,
  subjectMock10,
  subjectMock11,
];
