import { PolicyEditorSendType, PolicyRuleBackendType, PolicyRuleResourceType, PolicySubjectType } from "resourceadm/types/global";

// RESOURCE ID
export const resourceIdMock1: string = "test_id_1"
export const resourceIdMock2: string = "test_id_2"
export const resourceIdMock3: string = "test_id_3"

// RESOURCE TYPE
export const resourceTypeMock1: string = "urn:altinn:resource1"
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
  RuleId: `${resourceTypeMock1}:${resourceIdMock1}:ruleid:1`,
  Resources: [[`${resourceMock1.type}:${resourceMock1.id}`, `${resourceMock2.type}:${resourceMock2.id}`]],
  Actions: ['read', 'write'],
  Subject: [subjectStringBackendMock1, subjectStringBackendMock3],
  Description: 'Dette er en forklaring på hva regelen er.'
}

// POLICIES
export const policyMock1: PolicyEditorSendType = {
  Rules: [ruleMock1]
};

export const policyMock2: PolicyEditorSendType = {
  Rules: []
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
  SubjectId: "dagl",
  SubjectSource: "altinn:role",
  SubjectTitle: "Daglig leder",
  SubjectDescription: "Daglig leder fra enhetsregisteret"
}

const subjectMock2: PolicySubjectType = {
  SubjectId: "dagl2",
  SubjectSource: "altinn:role",
  SubjectTitle: "Daglig leder 2",
  SubjectDescription: "Daglig leder fra enhetsregisteret"
}

const subjectMock3: PolicySubjectType = {
  SubjectId: "dagl3",
  SubjectSource: "altinn:role",
  SubjectTitle: "Daglig leder 3",
  SubjectDescription: "Daglig leder fra enhetsregisteret"
}

const subjectMock4: PolicySubjectType = {
  SubjectId: "dagl4",
  SubjectSource: "altinn:role",
  SubjectTitle: "Daglig leder 4",
  SubjectDescription: "Daglig leder fra enhetsregisteret"
}

const subjectMock5: PolicySubjectType = {
  SubjectId: "dagl5",
  SubjectSource: "altinn:role",
  SubjectTitle: "Daglig leder 5",
  SubjectDescription: "Daglig leder fra enhetsregisteret"
}

const subjectMock6: PolicySubjectType = {
  SubjectId: "dagl 6",
  SubjectSource: "altinn:role",
  SubjectTitle: "Daglig leder 6",
  SubjectDescription: "Daglig leder fra enhetsregisteret"
}

const subjectMock7: PolicySubjectType = {
  SubjectId: "dagl7",
  SubjectSource: "altinn:role",
  SubjectTitle: "Daglig leder 7",
  SubjectDescription: "Daglig leder fra enhetsregisteret"
}

const subjectMock8: PolicySubjectType = {
  SubjectId: "dagl8",
  SubjectSource: "altinn:role",
  SubjectTitle: "Daglig leder 8",
  SubjectDescription: "Daglig leder fra enhetsregisteret"
}

const subjectMock9: PolicySubjectType = {
  SubjectId: "dagl9",
  SubjectSource: "altinn:role",
  SubjectTitle: "Daglig leder 9",
  SubjectDescription: "Daglig leder fra enhetsregisteret"
}

const subjectMock10: PolicySubjectType = {
  SubjectId: "dagl10",
  SubjectSource: "altinn:role",
  SubjectTitle: "Daglig leder 10",
  SubjectDescription: "Daglig leder fra enhetsregisteret"
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
