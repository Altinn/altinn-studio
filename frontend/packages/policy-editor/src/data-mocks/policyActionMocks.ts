import type { PolicyAction } from '../types';

export const mockActionTitle1: string = 'Action 1';
export const mockActionTitle2: string = 'Action 2';
export const mockActionTitle3: string = 'Action 3';

export const mockAction1: PolicyAction = {
  actionId: 'a1',
  actionTitle: mockActionTitle1,
  actionDescription: null,
};
export const mockAction2: PolicyAction = {
  actionId: 'a2',
  actionTitle: mockActionTitle2,
  actionDescription: null,
};
export const mockAction3: PolicyAction = {
  actionId: 'a3',
  actionTitle: mockActionTitle3,
  actionDescription: null,
};
export const mockActions: PolicyAction[] = [mockAction1, mockAction2, mockAction3];
