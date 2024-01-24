import type { PolicySubject } from '../types';

export const mockSubjectTitle1: string = 'Subject 1';
export const mockSubjectTitle2: string = 'Subject 2';
export const mockSubjectTitle3: string = 'Subject 3';

export const mockSubject1: PolicySubject = {
  subjectId: 's1',
  subjectSource: 'Subject1',
  subjectTitle: mockSubjectTitle1,
  subjectDescription: '',
};
export const mockSubject2: PolicySubject = {
  subjectId: 's2',
  subjectSource: 'Subject2',
  subjectTitle: mockSubjectTitle2,
  subjectDescription: '',
};
export const mockSubject3: PolicySubject = {
  subjectId: 's3',
  subjectSource: 'Subject3',
  subjectTitle: mockSubjectTitle3,
  subjectDescription: '',
};
export const mockSubjects: PolicySubject[] = [mockSubject1, mockSubject2, mockSubject3];

export const mockSubjectBackendString1: string = `urn:${mockSubject1.subjectSource}:${mockSubject1.subjectId}`;
export const mockSubjectBackendString3: string = `urn:${mockSubject3.subjectSource}:${mockSubject3.subjectId}`;
