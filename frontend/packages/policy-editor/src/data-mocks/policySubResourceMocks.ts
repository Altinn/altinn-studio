import type { PolicyRuleResource } from '../types';

export const mockResourecId1: string = 'resource-1';
export const mockResourecId2: string = '1.2';
export const mockResourecId3: string = '2.1';
export const mockResourecId4: string = '[ORG]';
export const mockResourecId5: string = '[APP]';

export const mockResourceType1: string = 'urn:test';
export const mockResourceType2: string = 'urn:test.1.2';
export const mockResourceType3: string = 'urn:test.2.1';
export const mockResourceType4: string = 'urn:test:org';
export const mockResourceType5: string = 'urn:test:app';

export const mockResource11: PolicyRuleResource = { type: mockResourceType1, id: mockResourecId1 };
const mockResource12: PolicyRuleResource = { type: mockResourceType2, id: mockResourecId2 };
const mockResource21: PolicyRuleResource = { type: mockResourceType3, id: mockResourecId3 };
export const mockResource31: PolicyRuleResource = { type: mockResourceType4, id: mockResourecId4 };
export const mockResource32: PolicyRuleResource = { type: mockResourceType5, id: mockResourecId5 };

const mockResource1: PolicyRuleResource[] = [mockResource11, mockResource12];
const mockResource2: PolicyRuleResource[] = [mockResource21];
export const mockResource3: PolicyRuleResource[] = [mockResource31, mockResource32];

export const mockPolicyRuleResources: PolicyRuleResource[][] = [mockResource1, mockResource2];

export const mockPolicyResourceBackendString1: string = `${mockResourceType1}:${mockResourecId1}`;
export const mockPolicyResourceBackendString2: string = `${mockResourceType2}:${mockResourecId2}`;
export const mockPolicyResourceBackendString3: string = `${mockResourceType3}:${mockResourecId3}`;
export const mockPolicyResourceBackend1: string[] = [
  mockPolicyResourceBackendString1,
  mockPolicyResourceBackendString2,
];
export const mockPolicyResourceBackend2: string[] = [mockPolicyResourceBackendString3];

export const mockPolicyResources: string[][] = [
  mockPolicyResourceBackend1,
  mockPolicyResourceBackend2,
];
