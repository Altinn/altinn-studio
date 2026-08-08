import type { PolicySubject } from '../../src/types';

export const mockSubjectId1: string = `urn:altinn:rolecode:s1`;
export const mockSubjectId2: string = `urn:altinn:rolecode:s2`;
export const mockSubjectId3: string = `urn:altinn:rolecode:s3`;
export const mockSubjectTitle1: string = 'Subject 1';
export const mockSubjectTitle2: string = 'Subject 2';
export const mockSubjectTitle3: string = 'Subject 3';

export const mockSubject1: PolicySubject = {
  id: 'd41d67f2-15b0-4c82-95db-b8d5baaa14a4',
  name: mockSubjectTitle1,
  description: 'Natural or legal person who is a deputy for a board member',
  urn: 'urn:altinn:external-role:ccr:sub1',
  legacyRoleCode: 'VARA',
  legacyUrn: mockSubjectId1,
  provider: {
    id: '0195ea92-2080-758b-89db-7735c4f68320',
    name: 'Altinn 2',
    code: 'sys-altinn2',
  },
};
export const mockSubject2: PolicySubject = {
  id: '1f8a2518-9494-468a-80a0-7405f0daf9e9',
  name: mockSubjectTitle2,
  description: 'Natural person who attends board meetings in a business, but without voting rights',
  urn: 'urn:altinn:external-role:ccr:sub2',
  legacyRoleCode: 'OBS',
  legacyUrn: mockSubjectId2,
  provider: {
    id: '0195ea92-2080-758b-89db-7735c4f68320',
    name: 'Altinn 2',
    code: 'sys-altinn2',
  },
};
export const mockSubject3: PolicySubject = {
  id: 'f045ffda-dbdc-41da-b674-b9b276ad5b01',
  name: mockSubjectTitle3,
  description: 'Natural or legal person who is a member of a board',
  urn: 'urn:altinn:external-role:ccr:sub3',
  legacyRoleCode: 'MEDL',
  legacyUrn: mockSubjectId3,
  provider: {
    id: '0195ea92-2080-758b-89db-7735c4f68320',
    name: 'Altinn 2',
    code: 'sys-altinn2',
  },
};
export const mockSubjects: PolicySubject[] = [mockSubject1, mockSubject2, mockSubject3];
