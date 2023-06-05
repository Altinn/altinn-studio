import { PolicyEditorSendType, PolicyRuleBackendType, PolicyRuleResourceType, PolicySubjectType } from "resourceadm/types/global";

// RESOURCE ID
export const resourceIdMock1: string = "test_id_1"
export const resourceIdMock2: string = "test_id_2"
export const resourceIdMock3: string = "test_id_3"

// RESOURCE TYPE
export const resourceTypeMock1: string = "urn:altinn.resource"
export const resourceTypeMock2: string = "urn:altinn:resource2"
export const resourceTypeMock3: string = "urn:altinn:resource3"

// RESOURCES
const resourceMock1: PolicyRuleResourceType = {
  type: resourceTypeMock1,
  id: resourceIdMock1
}
const resourceMock2: PolicyRuleResourceType = {
  type: resourceTypeMock2,
  id: resourceIdMock2
}

// SUBJECT STRINGS FROM BACKEND
export const subjectStringBackendMock1: string = 'urn:altinn:rolecode:dagl'
export const subjectStringBackendMock3: string = 'urn:altinn:rolecode:dagl3'

// RULES
const ruleMock1: PolicyRuleBackendType = {
  ruleId: `${resourceTypeMock1}:${resourceIdMock1}:ruleid:1`,
  resources: [[`${resourceMock1.type}:${resourceMock1.id}`, `${resourceMock2.type}:${resourceMock2.id}`]],
  actions: ['read', 'write'],
  subject: [subjectStringBackendMock1, subjectStringBackendMock3],
  description: 'Dette er en forklaring på hva regelen er.'
}

// POLICIES
export const policyMock1: PolicyEditorSendType = {
  rules: [ruleMock1],
  requiredAuthenticationLevelEndUser: '3',
  requiredAuthenticationLevelOrg: '4'
};

export const policyMock2: PolicyEditorSendType = {
  rules: [],
  requiredAuthenticationLevelEndUser: '3',
  requiredAuthenticationLevelOrg: '4'
};

// ACTIONS
export const actionsListMock: string[] = [
  "read",
  "write",
  "confirm",
  "sign",
  "delete"
]

// SUBJECTS
export const subjectMock1: PolicySubjectType = {
  subjectId: "dagl",
  subjectSource: "altinn:role",
  subjectTitle: "Daglig leder",
  subjectDescription: "Daglig leder fra enhetsregisteret"
}

const subjectMock2: PolicySubjectType = {
  subjectId: "dagl2",
  subjectSource: "altinn:role",
  subjectTitle: "Daglig leder 2",
  subjectDescription: "Daglig leder fra enhetsregisteret"
}

const subjectMock3: PolicySubjectType = {
  subjectId: "dagl3",
  subjectSource: "altinn:role",
  subjectTitle: "Daglig leder 3",
  subjectDescription: "Daglig leder fra enhetsregisteret"
}

const subjectMock4: PolicySubjectType = {
  subjectId: "dagl4",
  subjectSource: "altinn:role",
  subjectTitle: "Daglig leder 4",
  subjectDescription: "Daglig leder fra enhetsregisteret"
}

const subjectMock5: PolicySubjectType = {
  subjectId: "dagl5",
  subjectSource: "altinn:role",
  subjectTitle: "Daglig leder 5",
  subjectDescription: "Daglig leder fra enhetsregisteret"
}

const subjectMock6: PolicySubjectType = {
  subjectId: "dagl 6",
  subjectSource: "altinn:role",
  subjectTitle: "Daglig leder 6",
  subjectDescription: "Daglig leder fra enhetsregisteret"
}

const subjectMock7: PolicySubjectType = {
  subjectId: "dagl7",
  subjectSource: "altinn:role",
  subjectTitle: "Daglig leder 7",
  subjectDescription: "Daglig leder fra enhetsregisteret"
}

const subjectMock8: PolicySubjectType = {
  subjectId: "dagl8",
  subjectSource: "altinn:role",
  subjectTitle: "Daglig leder 8",
  subjectDescription: "Daglig leder fra enhetsregisteret"
}

const subjectMock9: PolicySubjectType = {
  subjectId: "dagl9",
  subjectSource: "altinn:role",
  subjectTitle: "Daglig leder 9",
  subjectDescription: "Daglig leder fra enhetsregisteret"
}

const subjectMock10: PolicySubjectType = {
  subjectId: "dagl10",
  subjectSource: "altinn:role",
  subjectTitle: "Daglig leder 10",
  subjectDescription: "Daglig leder fra enhetsregisteret"
}

export const subjectsListMock: PolicySubjectType[] = [
  subjectMock1,
  subjectMock2,
  subjectMock3,
  subjectMock4,
  subjectMock5,
  subjectMock6,
  subjectMock7,
  subjectMock8,
  subjectMock9,
  subjectMock10
]
