import type { PolicyAction } from '../types';

export const mockActionId1: string = 'a1';
export const mockActionId2: string = 'a2';
export const mockActionId3: string = 'a3';

const mockActionTitle1: string = 'Action 1';
const mockActionTitle2: string = 'Action 2';
const mockActionTitle3: string = 'Action 3';

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
export const mockActions: PolicyAction[] = [mockAction1, mockAction2, mockAction3];
