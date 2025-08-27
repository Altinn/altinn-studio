import type { PolicyAction } from '../../src/types';

export const mockActionId1: string = 'read';
export const mockActionId2: string = 'write';
export const mockActionId3: string = 'sign';
export const mockActionId4: string = 'a4';

const mockActionTitle1: string = 'Action 1';
const mockActionTitle2: string = 'Action 2';
const mockActionTitle3: string = 'Action 3';
const mockActionTitle4: string = 'Action 4';

export const mockAction1: PolicyAction = {
  actionId: mockActionId1,
  actionTitle: mockActionTitle1,
  actionDescription: null,
};
export const mockAction2: PolicyAction = {
  actionId: mockActionId2,
  actionTitle: mockActionTitle2,
  actionDescription: null,
};
export const mockAction3: PolicyAction = {
  actionId: mockActionId3,
  actionTitle: mockActionTitle3,
  actionDescription: null,
};
export const mockAction4: PolicyAction = {
  actionId: mockActionId4,
  actionTitle: mockActionTitle4,
  actionDescription: null,
};
export const mockActions: PolicyAction[] = [mockAction1, mockAction2, mockAction3, mockAction4];
